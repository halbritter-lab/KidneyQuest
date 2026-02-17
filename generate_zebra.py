from PIL import Image, ImageDraw

def create_zebra():
    # Create a 64x64 transparent image (standard simple sprite size)
    img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Coords for body parts
    # Body: x=10, y=25, w=35, h=25
    body_bbox = [10, 25, 45, 50]
    
    # Head: x=40, y=10, w=20, h=25 (facing right, slightly higher)
    head_bbox = [38, 10, 58, 35]
    
    # Draw legs (thick lines)
    # Front legs
    draw.rectangle([40, 50, 44, 62], fill=(255, 255, 255, 255))
    draw.rectangle([32, 50, 36, 60], fill=(255, 255, 255, 255)) # Back front leg
    
    # Back legs
    draw.rectangle([12, 50, 16, 62], fill=(255, 255, 255, 255))
    draw.rectangle([20, 50, 24, 60], fill=(255, 255, 255, 255)) # Back back leg

    # Draw body (white)
    draw.rectangle(body_bbox, fill=(255, 255, 255, 255))
    
    # Draw head (white)
    draw.rectangle(head_bbox, fill=(255, 255, 255, 255))
    
    # Draw simple stripes (diagonal black lines) on body
    for x in range(15, 45, 8):
        draw.line([x, 25, x-5, 50], fill=(0, 0, 0, 255), width=3)
        
    # Draw stripes on head
    draw.line([45, 12, 45, 30], fill=(0, 0, 0, 255), width=2)
    draw.line([52, 12, 52, 28], fill=(0, 0, 0, 255), width=2)

    # Eye
    draw.ellipse([50, 15, 54, 19], fill=(0, 0, 0, 255))
    
    # Snout
    draw.rectangle([54, 25, 58, 35], fill=(30, 30, 30, 255))

    # Mane
    draw.line([38, 10, 38, 30], fill=(0, 0, 0, 255), width=4)
    
    # Tail
    draw.line([10, 30, 2, 40], fill=(0, 0, 0, 255), width=2)
    
    # Save
    import os
    os.makedirs('assets/sprites', exist_ok=True)
    img.save('assets/sprites/zebra.png')
    print("Zebra sprite generated at assets/sprites/zebra.png")

if __name__ == "__main__":
    create_zebra()
