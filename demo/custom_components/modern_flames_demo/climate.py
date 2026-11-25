from homeassistant.components.climate import ClimateEntity, ClimateEntityFeature, HVACMode, HVACAction
from homeassistant.const import UnitOfTemperature, ATTR_TEMPERATURE
from . import DOMAIN
from .base import DemoEntity


async def async_setup_platform(hass, config, add, discovery_info=None):
    ents = [Fireplace(u) for u in hass.data[DOMAIN]]
    for e in ents:
        e.entity_id = f"climate.{e.unit.prefix}"
    add(ents)


class Fireplace(DemoEntity, ClimateEntity):
    _attr_hvac_modes = [HVACMode.OFF, HVACMode.FAN_ONLY, HVACMode.HEAT]
    _attr_fan_modes = ["off", "low", "high"]
    _attr_min_temp = 50
    _attr_max_temp = 85
    _attr_target_temperature_step = 1
    _attr_temperature_unit = UnitOfTemperature.FAHRENHEIT
    _attr_icon = "mdi:fireplace"
    _attr_supported_features = (ClimateEntityFeature.TARGET_TEMPERATURE | ClimateEntityFeature.FAN_MODE
                                | ClimateEntityFeature.TURN_ON | ClimateEntityFeature.TURN_OFF)
    _enable_turn_on_off_backwards_compatibility = False

    def __init__(self, unit):
        super().__init__(unit, None, None)

    @property
    def hvac_mode(self):
        u = self.unit
        if not u.power:
            return HVACMode.OFF
        return HVACMode.HEAT if u.fan in ("low", "high") else HVACMode.FAN_ONLY

    @property
    def hvac_action(self):
        m = self.hvac_mode
        return HVACAction.OFF if m == HVACMode.OFF else (HVACAction.HEATING if m == HVACMode.HEAT else HVACAction.FAN)

    @property
    def fan_mode(self):
        return self.unit.fan

    @property
    def target_temperature(self):
        # Like the real unit: no target is reported unless the heater is running.
        return self.unit.target if self.hvac_mode == HVACMode.HEAT else None

    @property
    def current_temperature(self):
        return self.unit.current

    async def async_set_hvac_mode(self, hvac_mode):
        u = self.unit
        if hvac_mode == HVACMode.OFF:
            u.power = False
        else:
            u.power = True
            if hvac_mode == HVACMode.HEAT and u.fan == "off":
                u.fan = "low"
            if hvac_mode == HVACMode.FAN_ONLY:
                u.fan = "off"
        u.changed()

    async def async_turn_on(self):
        await self.async_set_hvac_mode(HVACMode.FAN_ONLY)

    async def async_turn_off(self):
        await self.async_set_hvac_mode(HVACMode.OFF)

    async def async_set_fan_mode(self, fan_mode):
        self.unit.fan = fan_mode
        self.unit.power = True
        self.unit.changed()

    async def async_set_temperature(self, **kw):
        if ATTR_TEMPERATURE in kw:
            self.unit.target = int(kw[ATTR_TEMPERATURE])
            self.unit.changed()
