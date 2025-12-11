"""
Process Tracker Service - JSON IPC Interface for Electron
Communicates via stdin/stdout using JSON messages
"""

import sys
import json
import time
import threading
from process_tracker import ProcessTracker

class ProcessTrackerService:
    def __init__(self):
        self.tracker = ProcessTracker()
        self.running = True
        self.monitor_interval = 2  # Check every 2 seconds for better responsiveness
        self.pending_sessions = {}  # {session_id: {params, start_time, timeout}}

    def log(self, message):
        """Log to stderr to avoid interfering with JSON output"""
        print(f"[PROCESS_TRACKER_SERVICE] {message}", file=sys.stderr, flush=True)

    def send_response(self, success, data=None, error=None):
        """Send JSON response to stdout"""
        response = {
            'success': success,
            'data': data,
            'error': error,
            'timestamp': time.time()
        }
        print(json.dumps(response), flush=True)

    def send_notification(self, event_type, data):
        """Send async notification to Electron"""
        notification = {
            'type': 'notification',
            'event': event_type,
            'data': data,
            'timestamp': time.time()
        }
        print(json.dumps(notification), flush=True)

    def handle_start_tracking(self, params):
        """Start tracking a game process"""
        try:
            session_id = params['session_id']
            exe_path = params.get('exe_path', '')
            game_name = params.get('game_name', 'Unknown Game')
            wait_for_process = params.get('wait_for_process', True)
            timeout = params.get('timeout', 300)  # Default 5 minutes timeout

            # Try to start tracking immediately
            success = self.tracker.start_tracking(session_id, exe_path, game_name)

            if success:
                self.send_response(True, {
                    'tracking_started': True,
                    'session_id': session_id,
                    'game_name': game_name
                })
            elif wait_for_process:
                # Add to pending sessions
                self.pending_sessions[session_id] = {
                    'params': params,
                    'start_time': time.time(),
                    'timeout': timeout
                }
                self.log(f"Process not found for {game_name}, added to pending list (timeout: {timeout}s)")
                self.send_response(True, {
                    'tracking_started': False,
                    'pending': True,
                    'session_id': session_id,
                    'game_name': game_name,
                    'message': 'Waiting for process to start'
                })
            else:
                self.send_response(False, error=f"Process not found: {exe_path}")

        except Exception as e:
            self.log(f"Error in start_tracking: {e}")
            self.send_response(False, error=str(e))

    def handle_stop_tracking(self, params):
        """Stop tracking a session"""
        try:
            session_id = params['session_id']

            # Check if it's a pending session
            if session_id in self.pending_sessions:
                del self.pending_sessions[session_id]
                self.send_response(True, {
                    'session_id': session_id,
                    'runtime': 0,
                    'message': 'Pending tracking cancelled'
                })
                return

            runtime = self.tracker.stop_tracking(session_id)
            self.send_response(True, {
                'session_id': session_id,
                'runtime': runtime
            })
        except Exception as e:
            self.log(f"Error in stop_tracking: {e}")
            self.send_response(False, error=str(e))

    def handle_check_session(self, params):
        """Check if a session is still running"""
        try:
            session_id = params['session_id']

            if session_id in self.pending_sessions:
                self.send_response(True, {
                    'session_id': session_id,
                    'is_running': False,
                    'status': 'pending',
                    'runtime': 0
                })
                return

            is_running = self.tracker.is_process_running(session_id)
            runtime = self.tracker.get_runtime(session_id) if is_running else 0

            self.send_response(True, {
                'session_id': session_id,
                'is_running': is_running,
                'runtime': runtime
            })
        except Exception as e:
            self.log(f"Error in check_session: {e}")
            self.send_response(False, error=str(e))

    def handle_get_all_sessions(self, params):
        """Get all active sessions"""
        try:
            sessions = self.tracker.get_active_sessions()
            # Add pending sessions
            for sid, info in self.pending_sessions.items():
                sessions.append({
                    'session_id': sid,
                    'game_name': info['params'].get('game_name', 'Unknown'),
                    'status': 'pending',
                    'elapsed_wait': time.time() - info['start_time']
                })
            self.send_response(True, {'sessions': sessions})
        except Exception as e:
            self.log(f"Error in get_all_sessions: {e}")
            self.send_response(False, error=str(e))

    def handle_check_all(self, params):
        """Check all tracked processes"""
        try:
            status = self.tracker.check_all_processes()
            self.send_response(True, {'status': status})
        except Exception as e:
            self.log(f"Error in check_all: {e}")
            self.send_response(False, error=str(e))

    def check_pending_sessions(self):
        """Check if any pending sessions have started"""
        current_time = time.time()
        started_sessions = []
        timed_out_sessions = []

        for session_id, info in list(self.pending_sessions.items()):
            params = info['params']
            exe_path = params.get('exe_path', '')
            game_name = params.get('game_name', 'Unknown')
            timeout = info['timeout']
            start_time = info['start_time']

            # Check timeout
            if current_time - start_time > timeout:
                timed_out_sessions.append(session_id)
                continue

            # Try to start tracking
            if self.tracker.start_tracking(session_id, exe_path, game_name):
                started_sessions.append((session_id, game_name))

        # Update pending list and notify
        for session_id, game_name in started_sessions:
            del self.pending_sessions[session_id]
            self.send_notification('tracking_started', {
                'session_id': session_id,
                'game_name': game_name
            })
            self.log(f"Pending tracking started for {game_name}")

        for session_id in timed_out_sessions:
            game_name = self.pending_sessions[session_id]['params'].get('game_name', 'Unknown')
            del self.pending_sessions[session_id]
            self.send_notification('tracking_failed', {
                'session_id': session_id,
                'game_name': game_name,
                'reason': 'timeout'
            })
            self.log(f"Pending tracking timed out for {game_name}")

    def monitor_processes(self):
        """Background thread to monitor all processes"""
        self.log("Starting process monitor thread")

        while self.running:
            try:
                time.sleep(self.monitor_interval)

                # Check active processes
                status = self.tracker.check_all_processes()

                # Send notification for ended processes
                for session_id, is_running in status.items():
                    if not is_running:
                        runtime = self.tracker.get_runtime(session_id)
                        self.send_notification('process_ended', {
                            'session_id': session_id,
                            'runtime': runtime
                        })
                        # Stop tracking this session
                        self.tracker.stop_tracking(session_id)

                # Check pending sessions
                self.check_pending_sessions()

            except Exception as e:
                self.log(f"Error in monitor thread: {e}")

    def handle_command(self, command):
        """Handle incoming JSON command"""
        try:
            cmd = command['command']
            params = command.get('params', {})

            if cmd == 'start_tracking':
                self.handle_start_tracking(params)
            elif cmd == 'stop_tracking':
                self.handle_stop_tracking(params)
            elif cmd == 'check_session':
                self.handle_check_session(params)
            elif cmd == 'get_all_sessions':
                self.handle_get_all_sessions(params)
            elif cmd == 'check_all':
                self.handle_check_all(params)
            elif cmd == 'ping':
                self.send_response(True, {'message': 'pong'})
            elif cmd == 'shutdown':
                self.log("Shutdown command received")
                self.running = False
                self.send_response(True, {'message': 'shutting down'})
            else:
                self.send_response(False, error=f"Unknown command: {cmd}")

        except Exception as e:
            self.log(f"Error handling command: {e}")
            self.send_response(False, error=str(e))

    def run(self):
        """Main service loop"""
        self.log("Process Tracker Service started")

        # Start monitor thread
        monitor_thread = threading.Thread(target=self.monitor_processes, daemon=True)
        monitor_thread.start()

        # Send ready notification
        self.send_response(True, {'message': 'ready'})

        # Process commands from stdin
        try:
            for line in sys.stdin:
                if not line.strip():
                    continue

                try:
                    command = json.loads(line.strip())
                    self.handle_command(command)
                except json.JSONDecodeError as e:
                    self.log(f"Invalid JSON: {e}")
                    self.send_response(False, error=f"Invalid JSON: {str(e)}")

                if not self.running:
                    break

        except KeyboardInterrupt:
            self.log("Received keyboard interrupt")
        except Exception as e:
            self.log(f"Error in main loop: {e}")
        finally:
            self.log("Service shutting down")

if __name__ == '__main__':
    service = ProcessTrackerService()
    service.run()
