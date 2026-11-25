# Demo fireplaces (for testing the cards)

`modern_flames_demo` is a tiny custom integration that creates fake Modern Flames fireplaces with the same entities tuya-local makes for a Landscape Pro Slim. Nothing talks to a real device. Use it on a **test** Home Assistant install.

1. Copy `custom_components/modern_flames_demo` into your test install's `/config/custom_components/`.
2. Add to `configuration.yaml` and restart:

```yaml
modern_flames_demo:
  - prefix: living_room_fireplace
    name: Living Room Fireplace
    heat: low              # "off" | low | high (quote "off")
    target: 74
    current: 71
    timer: 2h
    remaining: 104
    flame: [255, 110, 20]
    embers: [255, 42, 0]
    downlight: [255, 176, 40]
  - prefix: patio_fireplace
    name: Patio Fireplace
    heat: "off"
    scene: Custom 1
    flame: [40, 140, 255]
    embers: [150, 60, 255]
    downlight: [0, 210, 180]
  - prefix: bedroom_fireplace
    name: Bedroom Fireplace
    power: false
```

Every control works on the fake units: power, heat, target temperature, colours, scenes, speed, timer and sync. State lives in memory and resets on restart.
