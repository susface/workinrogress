"""
Windows Process Tracker for Accurate Playtime Monitoring
Uses psutil to track if game processes are actually running
"""

import psutil
import time
import json
from pathlib import Path
from typing import Optional, Dict
from datetime import datetime


class ProcessTracker:
    def __init__(self):
        self.tracked_processes = {}  # {session_id: {process_info}}

    def find_process_by_path(self, exe_path: str) -> Optional[psutil.Process]:
        """
        Find a process by its executable path

        Args:
            exe_path: Full path to executable

        Returns:
            Process object if found, None otherwise
        """
        try:
            exe_path_normalized = Path(exe_path).resolve()

            for proc in psutil.process_iter(['pid', 'name', 'exe', 'create_time']):
                try:
                    proc_exe = proc.info.get('exe')
                    if proc_exe:
                        proc_exe_normalized = Path(proc_exe).resolve()
                        if proc_exe_normalized == exe_path_normalized:
                            return proc
                except (psutil.NoSuchProcess, psutil.AccessDenied, OSError):
                    continue

        except Exception as e:
            print(f"[PROCESS_TRACKER] Error finding process: {e}")

        return None

    def find_process_by_name(self, process_name: str) -> Optional[psutil.Process]:
        """
        Find a process by name (fallback method)

        Args:
            process_name: Name of the process (e.g., "game.exe")

        Returns:
            Process object if found, None otherwise
        """
        try:
            for proc in psutil.process_iter(['pid', 'name', 'create_time']):
                try:
                    if proc.info['name'].lower() == process_name.lower():
                        return proc
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception as e:
            print(f"[PROCESS_TRACKER] Error finding process by name: {e}")

        return None

    def extract_exe_path_from_url(self, launch_command: str) -> Optional[str]:
        """
        Extract executable path from launch URL

        Args:
            launch_command: Steam URL or executable path

        Returns:
            Executable path if extractable, None otherwise
        """
        # For Steam games: steam://rungameid/APPID
        # We can't get exe path from this, need to use game scanner data

        # For Epic games: Similar issue

        # For direct exe paths
        if launch_command.endswith('.exe'):
            return launch_command

        return None

    def start_tracking(self, session_id: int, exe_path: str, game_name: str) -> bool:
        """
        Start tracking a process for playtime

        Args:
            session_id: Database session ID
            exe_path: Path to game executable
            game_name: Name of the game

        Returns:
            True if tracking started, False otherwise
        """
        try:
            # Find the process
            process = self.find_process_by_path(exe_path)

            if not process:
                # Try by game name
                process_name = Path(exe_path).name
                process = self.find_process_by_name(process_name)

            if not process:
                print(f"[PROCESS_TRACKER] Could not find process for {game_name}")
                return False

            self.tracked_processes[session_id] = {
                'process': process,
                'game_name': game_name,
                'exe_path': exe_path,
                'start_time': time.time(),
                'pid': process.pid,
                'create_time': process.create_time()
            }

            print(f"[PROCESS_TRACKER] Started tracking {game_name} (PID: {process.pid})")
            return True

        except Exception as e:
            print(f"[PROCESS_TRACKER] Error starting tracking: {e}")
            return False

    def is_process_running(self, session_id: int) -> bool:
        """
        Check if a tracked process is still running

        Args:
            session_id: Database session ID

        Returns:
            True if running, False otherwise
        """
        if session_id not in self.tracked_processes:
            return False

        try:
            process = self.tracked_processes[session_id]['process']
            return process.is_running() and process.status() != psutil.STATUS_ZOMBIE
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return False

    def get_runtime(self, session_id: int) -> int:
        """
        Get total runtime in seconds for a tracked process

        Args:
            session_id: Database session ID

        Returns:
            Runtime in seconds, 0 if not found or not running
        """
        if session_id not in self.tracked_processes:
            return 0

        try:
            process_info = self.tracked_processes[session_id]

            if self.is_process_running(session_id):
                runtime = time.time() - process_info['start_time']
                return int(runtime)
            else:
                # Process ended, calculate final runtime
                # Try to get process end time from process_info if available
                return int(time.time() - process_info['start_time'])
        except Exception as e:
            print(f"[PROCESS_TRACKER] Error getting runtime: {e}")
            return 0

    def stop_tracking(self, session_id: int) -> int:
        """
        Stop tracking a process and return final runtime

        Args:
            session_id: Database session ID

        Returns:
            Final runtime in seconds
        """
        runtime = self.get_runtime(session_id)

        if session_id in self.tracked_processes:
            game_name = self.tracked_processes[session_id]['game_name']
            print(f"[PROCESS_TRACKER] Stopped tracking {game_name}, runtime: {runtime}s")
            del self.tracked_processes[session_id]

        return runtime

    def check_all_processes(self) -> Dict[int, bool]:
        """
        Check status of all tracked processes

        Returns:
            Dict of {session_id: is_running}
        """
        status = {}
        for session_id in list(self.tracked_processes.keys()):
            status[session_id] = self.is_process_running(session_id)

            # Auto-cleanup ended processes after reporting
            if not status[session_id]:
                print(f"[PROCESS_TRACKER] Process ended: {self.tracked_processes[session_id]['game_name']}")

        return status

    def get_active_sessions(self) -> list:
        """
        Get list of all active tracking sessions with runtime

        Returns:
            List of session info dicts
        """
        active = []
        for session_id, info in self.tracked_processes.items():
            if self.is_process_running(session_id):
                active.append({
                    'session_id': session_id,
                    'game_name': info['game_name'],
                    'pid': info['pid'],
                    'runtime': self.get_runtime(session_id)
                })
        return active


# Global tracker instance
_tracker = ProcessTracker()


def start_tracking_session(session_id: int, exe_path: str, game_name: str) -> bool:
    """Start tracking a game process"""
    return _tracker.start_tracking(session_id, exe_path, game_name)


def is_session_running(session_id: int) -> bool:
    """Check if a tracked session is still running"""
    return _tracker.is_process_running(session_id)


def get_session_runtime(session_id: int) -> int:
    """Get runtime for a session in seconds"""
    return _tracker.get_runtime(session_id)


def stop_tracking_session(session_id: int) -> int:
    """Stop tracking and return final runtime"""
    return _tracker.stop_tracking(session_id)


def get_all_active_sessions() -> list:
    """Get all active tracking sessions"""
    return _tracker.get_active_sessions()


def check_all_sessions() -> Dict[int, bool]:
    """Check all tracked sessions and return their status"""
    return _tracker.check_all_processes()


if __name__ == '__main__':
    # Test the tracker
    print("Process Tracker Test")
    print("=" * 50)

    # Example: Track notepad.exe
    import subprocess

    # Launch notepad for testing
    proc = subprocess.Popen(['notepad.exe'])
    time.sleep(1)

    # Start tracking
    session_id = 1
    exe_path = r"C:\Windows\System32\notepad.exe"

    if start_tracking_session(session_id, exe_path, "Notepad Test"):
        print(f"Tracking started for session {session_id}")

        # Monitor for 5 seconds
        for i in range(5):
            time.sleep(1)
            running = is_session_running(session_id)
            runtime = get_session_runtime(session_id)
            print(f"  After {i+1}s: Running={running}, Runtime={runtime}s")

        # Stop tracking
        final_runtime = stop_tracking_session(session_id)
        print(f"Final runtime: {final_runtime}s")

        # Kill notepad
        proc.terminate()
    else:
        print("Failed to start tracking")
        proc.terminate()
