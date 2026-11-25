import colorsys
from homeassistant.components.light import LightEntity, ColorMode, ATTR_HS_COLOR, ATTR_BRIGHTNESS, ATTR_RGB_COLOR
from . import DOMAIN
from .base import DemoEntity


async def async_setup_platform(hass, config, add, discovery_info=None):
    ents = []
    for u in hass.data[DOMAIN]:
        for z in ("flame", "embers", "downlight"):
            e = Zone(u, z)
            e.entity_id = f"light.{u.prefix}_{z}"
            ents.append(e)
    add(ents)


class Zone(DemoEntity, LightEntity):
    _attr_supported_color_modes = {ColorMode.HS}
    _attr_color_mode = ColorMode.HS

    def __init__(self, unit, zone):
        super().__init__(unit, zone, zone.title())
        self.zone = zone
        if zone == "downlight":
            self._attr_icon = "mdi:spotlight-beam"

    @property
    def is_on(self):
        return self.unit.power and self.unit.zones[self.zone]["bri"] > 0

    @property
    def brightness(self):
        return self.unit.zones[self.zone]["bri"]

    @property
    def hs_color(self):
        r, g, b = (c / 255 for c in self.unit.zones[self.zone]["rgb"])
        h, s, _ = colorsys.rgb_to_hsv(r, g, b)
        return (round(h * 360), round(s * 100))

    async def async_turn_on(self, **kw):
        z = self.unit.zones[self.zone]
        self.unit.power = True
        if ATTR_HS_COLOR in kw:
            h, s = kw[ATTR_HS_COLOR]
            z["rgb"] = [round(c * 255) for c in colorsys.hsv_to_rgb(h / 360, s / 100, 1)]
        if ATTR_RGB_COLOR in kw:
            z["rgb"] = list(kw[ATTR_RGB_COLOR])
        if ATTR_BRIGHTNESS in kw:
            z["bri"] = kw[ATTR_BRIGHTNESS]
        elif z["bri"] == 0:
            z["bri"] = 255
        targets = ("flame", "embers", "downlight") if self.unit.sync else (self.zone,)
        for t in targets:
            self.unit.zones[t].update({"rgb": list(z["rgb"]), "bri": z["bri"]})
        self.unit.changed()

    async def async_turn_off(self, **kw):
        # Like the real unit, a zone is "off" at brightness 0; DP1 still powers the fireplace.
        self.unit.zones[self.zone]["bri"] = 0
        self.unit.changed()
