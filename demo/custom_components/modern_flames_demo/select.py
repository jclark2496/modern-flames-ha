from homeassistant.components.select import SelectEntity
from . import DOMAIN, SCENES, TIMERS, TIMER_MIN
from .base import DemoEntity


async def async_setup_platform(hass, config, add, discovery_info=None):
    ents = []
    for u in hass.data[DOMAIN]:
        for cls in (Scene, Speed, Timer):
            e = cls(u)
            e.entity_id = f"select.{u.prefix}_{e.key}"
            ents.append(e)
    add(ents)


class Scene(DemoEntity, SelectEntity):
    key = "scene"
    _attr_options = SCENES
    _attr_icon = "mdi:palette"

    def __init__(self, u):
        super().__init__(u, self.key, "Scene")

    @property
    def current_option(self):
        return self.unit.scene

    async def async_select_option(self, option):
        self.unit.scene = option
        self.unit.changed()


class Speed(DemoEntity, SelectEntity):
    key = "flame_motor_speed"
    _attr_options = ["1", "2", "3", "4"]
    _attr_icon = "mdi:fan"

    def __init__(self, u):
        super().__init__(u, self.key, "Flame motor speed")

    @property
    def current_option(self):
        return self.unit.speed

    async def async_select_option(self, option):
        self.unit.speed = option
        self.unit.changed()


class Timer(DemoEntity, SelectEntity):
    key = "timer"
    _attr_options = TIMERS

    def __init__(self, u):
        super().__init__(u, self.key, "Timer")

    @property
    def current_option(self):
        return self.unit.timer

    async def async_select_option(self, option):
        self.unit.timer = option
        self.unit.remaining = TIMER_MIN[option]
        self.unit.changed()
