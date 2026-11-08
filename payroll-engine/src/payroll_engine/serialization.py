"""JSON <-> dataclass conversion for inputs and results.

Decimals travel as strings (or exact JSON numbers parsed as Decimal), dates as ISO strings.
"""

from __future__ import annotations

import json
from dataclasses import fields, is_dataclass
from datetime import date
from decimal import Decimal
from enum import Enum
from types import NoneType, UnionType
from typing import Any, TypeVar, Union, cast, get_args, get_origin, get_type_hints

T = TypeVar("T")


class SerializationError(ValueError):
    pass


def loads(text: str) -> Any:
    """Parse JSON with every non-integer number as Decimal."""
    return json.loads(text, parse_float=Decimal)


def dumps(obj: object) -> str:
    return json.dumps(to_jsonable(obj), ensure_ascii=False, indent=2)


def from_dict(cls: type[T], data: Any) -> T:
    return cast(T, _decode(cls, data, cls.__name__))


def to_jsonable(obj: object) -> Any:
    if isinstance(obj, Decimal):
        return str(obj)
    if isinstance(obj, date):
        return obj.isoformat()
    if isinstance(obj, Enum):
        return obj.value
    if is_dataclass(obj) and not isinstance(obj, type):
        return {f.name: to_jsonable(getattr(obj, f.name)) for f in fields(obj)}
    if isinstance(obj, list | tuple):
        return [to_jsonable(x) for x in obj]
    if isinstance(obj, dict):
        return {str(k): to_jsonable(v) for k, v in obj.items()}
    return obj


def _decode(tp: Any, value: Any, path: str) -> Any:
    origin = get_origin(tp)
    if origin in (Union, UnionType):
        options = [a for a in get_args(tp) if a is not NoneType]
        if value is None:
            if len(options) < len(get_args(tp)):
                return None
            raise SerializationError(f"{path}: value is required")
        return _decode(options[0], value, path)
    if origin is tuple:
        if not isinstance(value, list):
            raise SerializationError(f"{path}: expected a list")
        item = get_args(tp)[0]
        return tuple(_decode(item, v, f"{path}[{i}]") for i, v in enumerate(value))
    if tp is Decimal:
        if isinstance(value, bool) or not isinstance(value, Decimal | int | str):
            raise SerializationError(f"{path}: expected a decimal number or string")
        try:
            return Decimal(value)
        except ArithmeticError:
            raise SerializationError(f"{path}: invalid decimal {value!r}") from None
    if tp is date:
        try:
            return date.fromisoformat(value)
        except (TypeError, ValueError):
            raise SerializationError(f"{path}: expected an ISO date") from None
    if isinstance(tp, type) and issubclass(tp, Enum):
        try:
            return tp(value)
        except ValueError:
            raise SerializationError(f"{path}: invalid value {value!r}") from None
    if tp is bool or tp is str:
        if not isinstance(value, tp):
            raise SerializationError(f"{path}: expected {tp.__name__}")
        return value
    if tp is int:
        if isinstance(value, bool) or not isinstance(value, int):
            raise SerializationError(f"{path}: expected an integer")
        return value
    if isinstance(tp, type) and is_dataclass(tp):
        return _decode_dataclass(tp, value, path)
    raise SerializationError(f"{path}: unsupported type {tp!r}")


def _decode_dataclass(tp: type[Any], value: Any, path: str) -> Any:
    if not isinstance(value, dict):
        raise SerializationError(f"{path}: expected an object")
    hints = get_type_hints(tp)
    unknown = set(value) - set(hints)
    if unknown:
        raise SerializationError(f"{path}: unknown fields {sorted(unknown)}")
    kwargs = {k: _decode(hints[k], v, f"{path}.{k}") for k, v in value.items()}
    try:
        return tp(**kwargs)
    except (TypeError, ValueError) as exc:
        raise SerializationError(f"{path}: {exc}") from None
