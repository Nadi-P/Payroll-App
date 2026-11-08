"""Pay component catalog: what each component is and which bases it counts toward.

Loaded from the `components.catalog` rule, so adding a component needs no code change.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from dataclasses import dataclass, fields
from enum import StrEnum

from payroll_engine.rules import ResolvedRules, RuleError

CATALOG_RULE = "components.catalog"
_FLAGS = frozenset({"taxable", "insurable", "pension_base", "study_fund_base", "severance_base"})


class ComponentKind(StrEnum):
    EARNING = "earning"  # cash paid to the employee, part of gross pay
    BENEFIT = "benefit"  # non-cash value (shovi): taxed, never paid out
    DEDUCTION = "deduction"  # reduces net pay only


class UnknownComponentError(KeyError):
    pass


@dataclass(frozen=True)
class Component:
    code: str
    name_he: str
    name_en: str
    name_ar: str
    name_ru: str
    kind: ComponentKind
    taxable: bool
    insurable: bool
    pension_base: bool
    study_fund_base: bool
    severance_base: bool
    active: bool = True  # inactive components stay valid for old payslips but are not offered


@dataclass(frozen=True)
class CustomComponent:
    """A component a company added, or its own version of a shipped one (same code)."""

    code: str
    name_he: str
    name_en: str
    name_ar: str
    name_ru: str
    kind: ComponentKind
    taxable: bool = False
    insurable: bool = False
    pension_base: bool = False
    study_fund_base: bool = False
    severance_base: bool = False
    active: bool = True


class Catalog:
    def __init__(self, components: Mapping[str, Component]) -> None:
        self._components = dict(components)

    @classmethod
    def from_rules(cls, rules: ResolvedRules) -> Catalog:
        components: dict[str, Component] = {}
        for code, raw in rules.value(CATALOG_RULE).items():
            flags = set(raw["flags"])
            unknown = flags - _FLAGS
            if unknown:
                raise RuleError(f"component {code}: unknown flags {sorted(unknown)}")
            components[code] = Component(
                code=code,
                name_he=raw["he"],
                name_en=raw["en"],
                name_ar=raw.get("ar", raw["en"]),
                name_ru=raw.get("ru", raw["en"]),
                kind=ComponentKind(raw["kind"]),
                taxable="taxable" in flags,
                insurable="insurable" in flags,
                pension_base="pension_base" in flags,
                study_fund_base="study_fund_base" in flags,
                severance_base="severance_base" in flags,
            )
        return cls(components)

    def extended(self, custom: Iterable[CustomComponent]) -> Catalog:
        """This catalog with a company's own components added; same code replaces."""
        components = dict(self._components)
        for c in custom:
            components[c.code] = Component(**{f.name: getattr(c, f.name) for f in fields(c)})
        return Catalog(components)

    def get(self, code: str) -> Component:
        try:
            return self._components[code]
        except KeyError:
            raise UnknownComponentError(f"unknown pay component '{code}'") from None

    def components(self) -> tuple[Component, ...]:
        return tuple(self._components[code] for code in sorted(self._components))

    def __contains__(self, code: object) -> bool:
        return code in self._components
