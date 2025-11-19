#!/usr/bin/env python3
"""
Create placeholder icons for CoverFlow Game Launcher
Requires: pip install pillow
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_app_icon():
    """Create the main app icon (PNG)"""
    # Create a 512x512 image with a game controller theme
    size = 512
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Purple gradient background circle
    for i in range(size // 2):
        alpha = int(255 * (1 - i / (size / 2)))
        color1 = (102, 126, 234, alpha)  # #667eea
        color2 = (118, 75, 162, alpha)   # #764ba2
        blend = i / (size / 2)
        color = tuple(int(color1[j] + (color2[j] - color1[j]) * blend) for j in range(4))
        draw.ellipse([i, i, size-i, size-i], fill=color)

    # Draw a game controller emoji or text
    try:
        # Try to use emoji
        font_size = 300
        try:
            font = ImageFont.truetype("seguiemj.ttf", font_size)  # Windows emoji font
        except (OSError, IOError):
            try:
                font = ImageFont.truetype("/System/Library/Fonts/Apple Color Emoji.ttc", font_size)  # Mac
            except (OSError, IOError):
                font = ImageFont.truetype("NotoColorEmoji.ttf", font_size)  # Linux

        text = "🎮"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (size - text_width) // 2 - bbox[0]
        y = (size - text_height) // 2 - bbox[1]
        draw.text((x, y), text, font=font, embedded_color=True)
    except (OSError, IOError, AttributeError) as e:
        # Fallback: draw "CF" text
        print(f"Warning: Could not load emoji font ({e}), using fallback text")
        try:
            font = ImageFont.truetype("arial.ttf", 200)
        except (OSError, IOError):
            font = ImageFont.load_default()

        text = "CF"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (size - text_width) // 2 - bbox[0]
        y = (size - text_height) // 2 - bbox[1]
        draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)

    return img

def create_placeholder_image():
    """Create placeholder for missing game covers"""
    size = 512
    img = Image.new('RGB', (size, size), (40, 40, 50))
    draw = ImageDraw.Draw(img)

    # Draw gradient background
    for y in range(size):
        shade = int(40 + (y / size) * 20)
        draw.line([(0, y), (size, y)], fill=(shade, shade, shade + 10))

    # Draw game controller emoji or text
    try:
        font_size = 200
        try:
            font = ImageFont.truetype("seguiemj.ttf", font_size)
        except (OSError, IOError):
            try:
                font = ImageFont.truetype("/System/Library/Fonts/Apple Color Emoji.ttc", font_size)
            except (OSError, IOError):
                font = ImageFont.truetype("NotoColorEmoji.ttf", font_size)

        text = "🎮"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (size - text_width) // 2 - bbox[0]
        y = (size - text_height) // 2 - bbox[1]
        draw.text((x, y), text, font=font, embedded_color=True)
    except (OSError, IOError, AttributeError) as e:
        # Fallback
        print(f"Warning: Could not load emoji font ({e}), using fallback text")
        try:
            font = ImageFont.truetype("arial.ttf", 60)
        except (OSError, IOError):
            font = ImageFont.load_default()

        text = "No Cover\nAvailable"
        bbox = draw.textbbox((0, 0), text, font=font, align='center')
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (size - text_width) // 2 - bbox[0]
        y = (size - text_height) // 2 - bbox[1]
        draw.multiline_text((x, y), text, fill=(150, 150, 160), font=font, align='center')

    return img

def main():
    print("Creating CoverFlow Game Launcher icons...")

    # Create icon.png (256x256 for tray/Linux)
    print("Creating icon.png...")
    icon = create_app_icon()
    icon_256 = icon.resize((256, 256), Image.Resampling.LANCZOS)
    icon_256.save('icon.png', 'PNG')
    print("✓ icon.png created (256x256)")

    # Create icon.ico (Windows - multiple sizes)
    print("Creating icon.ico...")
    icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    icon_images = [icon.resize(size, Image.Resampling.LANCZOS) for size in icon_sizes]
    icon_images[0].save('icon.ico', format='ICO', sizes=icon_sizes, append_images=icon_images[1:])
    print("✓ icon.ico created (multi-size)")

    # Create icon.icns (macOS)
    # Note: .icns requires special handling, for now we'll create PNG and user can convert
    print("Creating icon_512.png for macOS (convert to .icns manually)...")
    icon.save('icon_512.png', 'PNG')
    print("✓ icon_512.png created (use 'png2icns icon.icns icon_512.png' on macOS)")

    # Create placeholder.png
    print("Creating placeholder.png...")
    placeholder = create_placeholder_image()
    placeholder.save('placeholder.png', 'PNG')
    print("✓ placeholder.png created (512x512)")

    print("\n✅ All icons created successfully!")
    print("\nFiles created:")
    print("  - icon.png (Linux/Tray)")
    print("  - icon.ico (Windows)")
    print("  - icon_512.png (for macOS - needs conversion to .icns)")
    print("  - placeholder.png (Game cover fallback)")
    print("\nNote: Game boxart and icons will be downloaded automatically by the scanners.")

if __name__ == '__main__':
    main()
