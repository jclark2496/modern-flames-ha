from homeassistant.components.sensor import SensorEntity, SensorDeviceClass
from homeassistant.const import UnitOfTime
from . import DOMAIN
from .base import DemoEntity


async def async_setup_platform(hass, config, add, discovery_info=None):
    ents = []
    for u in hass.data[DOMAIN]:
        e = Remaining(u)
        e.entity_id = f"sensor.{u.prefix}_time_remaining"
        ents.append(e)
    add(ents)


class Remaining(DemoEntity, SensorEntity):
    _attr_device_class = SensorDeviceClass.DURATION
    _attr_native_unit_of_measurement = UnitOfTime.MINUTES

    def __init__(self, u):
        super().__init__(u, "time_remaining", "Time remaining")

    @property
    def native_value(self):
        return self.unit.remaining
