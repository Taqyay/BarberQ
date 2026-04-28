# BarberQ Design System

## Core Aesthetics
- **Theme Name**: Golden Sand (Stitch Light)
- **Vibe**: Premium, clean, soft, elegant

## Colors
- **Primary**: Antique Gold `#C5A059` (used with gradients on buttons: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary) 100%)`)
- **Background**: Cream `#F8F7F4`
- **Surface**: Pure White `#FFFFFF`
- **Surface Highlight**: Cream `#F8F7F4`
- **Border**: Subtle `#E8E6E1`

## Typography
- **Heading Font**: Manrope, sans-serif (font-weight: 600, letter-spacing: -0.02em)
- **Body Font**: Manrope, sans-serif
- **Text Main**: Near Black `#1F1F1F`
- **Text Secondary**: Medium Gray `#6B6B6B`
- **Text Tertiary**: Light Gray `#9E9E9E`

## Geometry & Shapes
- **Corner Radius**: Very rounded
  - Cards: `16px`
  - Primary Buttons: `20px`
  - Large Elements: `24px`
- **Shadows**: Soft and subtle (`0 4px 12px rgba(0,0,0,0.12)` for large shadows)

## Components
- **Primary Button**: Uses the primary color gradient, white text, bold font (700), large padding (1.5rem), 20px border radius, large shadow, and a subtle scale down effect on active.
- **Secondary Button**: Surface background, main text color, bordered, 16px border radius.
- **Cards**: Surface background, 16px border radius, subtle border.
- **Animations**: Uses a simple slide-up fade-in animation (`transform: translateY(10px)` to `0`, `opacity: 0` to `1` over 0.3s).

## Instructions for Stitch
When generating screens, ensure all components adhere to the color palette, utilize the 'Manrope' font, and maintain the very rounded (16px - 20px) border radii. Ensure shadows are soft and subtle. Keep layouts clean with ample padding and spacing.
