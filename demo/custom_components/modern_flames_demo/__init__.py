"""Fake Modern Flames fireplaces that mirror tuya-local's Landscape Pro Slim entities.

For trying the cards without a fireplace. Nothing here talks to a real device.

configuration.yaml:
  modern_flames_demo:
    - prefix: living_room_fireplace
      name: Living Room Fireplace
      power: true
      heat: low            # off | low | high
      flame: [255, 77, 0]  # RGB
      embers: [255, 42, 0]
      downlight: [255, 140, 40]
"""
from __future__ import annotations

from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers.discovery import async_load_platform

DOMAIN = "modern_flames_demo"
PLATFORMS = [Platform.CLIMATE, Platform.LIGHT, Platform.SELECT, Platform.SENSOR, Platform.SWITCH]
SCENES = ["Default", "Rainbow fade", "3-color fade", "Red fade", "Green fade", "Blue fade",
          "Rainbow jump", "3-color jump", "Custom 1", "Custom 2", "Custom 3"]
TIMERS = ["cancel", "30m", "1h", "2h", "3h", "4h", "5h", "6h", "7h", "8h"]
TIMER_MIN = {"cancel": 0, "30m": 30, **{f"{h}h": h * 60 for h in range(1, 9)}}


class Unit:
    """Shared state for one fake fireplace (DP1 powers everything, like the real unit)."""

    def __init__(self, cfg: dict) -> None:
        self.prefix = cfg["prefix"]
        self.name = cfg.get("name", self.prefix.replace("_", " ").title())
        self.power = bool(cfg.get("power", True))
        self.fan = cfg.get("heat", "off")
        self.target = int(cfg.get("target", 72))
        self.current = int(cfg.get("current", 70))
        self.scene = cfg.get("scene", "Default")
        self.speed = str(cfg.get("speed", "3"))
        self.timer = cfg.get("timer", "cancel")
        self.remaining = int(cfg.get("remaining", TIMER_MIN.get(self.timer, 0)))
        self.sync = bool(cfg.get("sync", False))
        self.zones = {z: {"rgb": list(cfg.get(z, d)), "bri": int(cfg.get(z + "_brightness", 255))}
                      for z, d in (("flame", [255, 77, 0]), ("embers", [255, 42, 0]), ("downlight", [255, 140, 40]))}
        self.listeners: list = []

    def changed(self) -> None:
        for cb in list(self.listeners):
            cb()


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    units = [Unit(c) for c in config.get(DOMAIN, [])]
    hass.data[DOMAIN] = units
    for p in PLATFORMS:
        hass.async_create_task(async_load_platform(hass, p, DOMAIN, {}, config))
    return True
