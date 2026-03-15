from collections import defaultdict
from collections.abc import Callable


EventHandler = Callable[[dict], None]


class EventBus:
    def __init__(self) -> None:
        self._handlers: dict[str, list[EventHandler]] = defaultdict(list)

    def subscribe(self, event_name: str, handler: EventHandler) -> None:
        self._handlers[event_name].append(handler)

    def publish(self, event_name: str, payload: dict) -> None:
        for handler in self._handlers[event_name]:
            handler(payload)


event_bus = EventBus()
