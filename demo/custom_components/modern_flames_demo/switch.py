from homeassistant.components.switch import SwitchEntity
from . import DOMAIN
from .base import DemoEntity


async def async_setup_platform(hass, config, add, discovery_info=None):
    ents = []
    for u in hass.data[DOMAIN]:
        e = Sync(u)
        e.entity_id = f"switch.{u.prefix}_sync_lights"
        ents.append(e)
    add(ents)


class Sync(DemoEntity, SwitchEntity):
    _attr_icon = "mdi:sync"

    def __init__(self, u):
        super().__init__(u, "sync_lights", "Sync lights")

    @property
    def is_on(self):
        return self.unit.sync

    async def async_turn_on(self, **kw):
        self.unit.sync = True
        self.unit.changed()

    async def async_turn_off(self, **kw):
        self.unit.sync = False
        self.unit.changed()
