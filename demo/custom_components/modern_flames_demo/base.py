from homeassistant.helpers.entity import Entity
from . import Unit


class DemoEntity(Entity):
    _attr_should_poll = False

    def __init__(self, unit: Unit, suffix: str | None, label: str | None) -> None:
        self.unit = unit
        self.entity_id_hint = unit.prefix + (f"_{suffix}" if suffix else "")
        self._attr_unique_id = f"mfdemo_{self.entity_id_hint}"
        self._attr_name = unit.name + (f" {label}" if label else "")

    async def async_added_to_hass(self) -> None:
        self.unit.listeners.append(self.async_write_ha_state)

    async def async_will_remove_from_hass(self) -> None:
        self.unit.listeners.remove(self.async_write_ha_state)
