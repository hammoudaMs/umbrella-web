"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Crosshair, Loader2, Map, MapPin, Search } from "lucide-react";
import { AutocompleteField } from "@/components/AutocompleteField";
import { MapPinPicker } from "@/components/MapPinPicker";
import { scoreAddress } from "@/lib/address-quality";
import {
  getCurrentPositionPrecise,
  queryGeoPermission,
  type GeoPermissionState,
} from "@/lib/geolocation";
import {
  reverseGeocodeTunisia,
  searchPhotonInPlace,
  searchPlacesCombined,
  type AddressSuggestion,
} from "@/lib/location-search";
import { bilingualLabel } from "@/lib/place-labels-ar";
import { displayGovernorate } from "@/lib/normalize-text";
import {
  citiesForGovernorate,
  governoratesWithCities,
  resolveOfficialCity,
} from "@/lib/tunisia-address";
import { localitiesForCity } from "@/lib/tunisia-localities";

export type AddressLocationValue = {
  governorate: string;
  city: string;
  locality: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  accuracyMeters?: number | null;
};

type AddressLocationFieldsProps = {
  value: AddressLocationValue;
  onChange: (next: AddressLocationValue) => void;
  required?: boolean;
  fieldClass?: string;
  showStreet?: boolean;
  compact?: boolean;
  /** Hide the qualité adresse score (e.g. expéditeur). */
  showQuality?: boolean;
};

const DEFAULT_FIELD =
  "w-full rounded-lg border border-ops-card bg-ops-page px-3 py-2.5 text-sm text-ops-ink outline-none transition focus:border-ops-accent";

const GOVERNORATES = Object.keys(governoratesWithCities);

function permissionHint(state: GeoPermissionState): string {
  if (state === "unsupported") {
    return "Localisation indisponible (HTTPS requis, ou navigateur non compatible).";
  }
  if (state === "denied") {
    return "Permission refusée. Sur iPhone : Réglages → Safari → Localisation. Sur Android : cadenas du site → Autorisations.";
  }
  return "Autorisez la localisation pour remplir l’adresse avec précision.";
}

export function AddressLocationFields({
  value,
  onChange,
  required = true,
  fieldClass = DEFAULT_FIELD,
  showStreet = true,
  compact = false,
  showQuality = true,
}: AddressLocationFieldsProps) {
  const searchId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [permission, setPermission] = useState<GeoPermissionState>("prompt");
  const [locating, setLocating] = useState(false);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  const [localityQuery, setLocalityQuery] = useState("");
  const [remoteCities, setRemoteCities] = useState<string[]>([]);
  const [remoteLocalities, setRemoteLocalities] = useState<string[]>([]);

  const quality = useMemo(() => scoreAddress(value), [value]);

  const cityOptions = useMemo(
    () => (value.governorate ? citiesForGovernorate(value.governorate) : []),
    [value.governorate],
  );

  const localityOptions = useMemo(
    () =>
      value.governorate
        ? localitiesForCity(value.governorate, value.city)
        : [],
    [value.governorate, value.city],
  );

  useEffect(() => {
    void queryGeoPermission().then(setPermission);
  }, []);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);

    const timer = window.setTimeout(() => {
      void searchPlacesCombined(q, controller.signal)
        .then((hits) => {
          if (!controller.signal.aborted) {
            setSuggestions(hits);
            setActiveIndex(0);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setSuggestions([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  useEffect(() => {
    if (!value.governorate || cityQuery.trim().length < 2) {
      setRemoteCities([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void searchPhotonInPlace(
        cityQuery,
        value.governorate,
        undefined,
        controller.signal,
      )
        .then((names) => {
          if (!controller.signal.aborted) setRemoteCities(names);
        })
        .catch(() => {
          if (!controller.signal.aborted) setRemoteCities([]);
        });
    }, 280);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cityQuery, value.governorate]);

  useEffect(() => {
    if (!value.governorate || !value.city || localityQuery.trim().length < 2) {
      setRemoteLocalities([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void searchPhotonInPlace(
        localityQuery,
        value.governorate,
        value.city,
        controller.signal,
      )
        .then((names) => {
          if (!controller.signal.aborted) setRemoteLocalities(names);
        })
        .catch(() => {
          if (!controller.signal.aborted) setRemoteLocalities([]);
        });
    }, 280);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [localityQuery, value.governorate, value.city]);

  const applySuggestion = useCallback(
    (hit: AddressSuggestion) => {
      onChange({
        governorate: hit.governorate,
        city: resolveOfficialCity(hit.governorate, hit.city) ?? hit.city,
        locality: hit.locality ?? "",
        address: hit.street ?? value.address,
        lat: hit.lat ?? null,
        lng: hit.lng ?? null,
        accuracyMeters: value.accuracyMeters ?? null,
      });
      setSearchQuery(hit.label);
      setSearchOpen(false);
      setGeoMessage(null);
    },
    [onChange, value.address, value.accuracyMeters],
  );

  async function captureMyLocation() {
    setLocating(true);
    setGeoMessage(null);
    const result = await getCurrentPositionPrecise();
    const nextPermission = await queryGeoPermission();
    setPermission(nextPermission);

    if (!result.ok) {
      setGeoMessage(result.message);
      setLocating(false);
      return;
    }

    try {
      const place = await reverseGeocodeTunisia(
        result.coords.lat,
        result.coords.lng,
      );
      if (place) {
        onChange({
          governorate: place.governorate,
          city: place.city,
          locality: place.locality ?? "",
          address: place.street ?? place.label,
          lat: result.coords.lat,
          lng: result.coords.lng,
          accuracyMeters: result.coords.accuracyMeters,
        });
        setSearchQuery(place.label);
        setGeoMessage(
          `Position capturée (±${Math.round(result.coords.accuracyMeters)} m).`,
        );
      } else {
        onChange({
          ...value,
          lat: result.coords.lat,
          lng: result.coords.lng,
          accuracyMeters: result.coords.accuracyMeters,
        });
        setGeoMessage(
          `Coordonnées enregistrées (±${Math.round(result.coords.accuracyMeters)} m). Complétez l’adresse manuellement.`,
        );
      }
    } catch {
      onChange({
        ...value,
        lat: result.coords.lat,
        lng: result.coords.lng,
        accuracyMeters: result.coords.accuracyMeters,
      });
      setGeoMessage(
        "Position OK, mais l’adresse n’a pas pu être déduite. Saisissez-la manuellement.",
      );
    } finally {
      setLocating(false);
    }
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!searchOpen && (event.key === "ArrowDown" || event.key === "Enter")) {
      setSearchOpen(true);
      return;
    }
    if (!searchOpen) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) =>
        Math.min(i + 1, Math.max(suggestions.length - 1, 0)),
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const pick = suggestions[activeIndex];
      if (pick) applySuggestion(pick);
    } else if (event.key === "Escape") {
      setSearchOpen(false);
    }
  }

  return (
    <div className="space-y-3" ref={rootRef}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ops-ink/50">{permissionHint(permission)}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowMap((v) => !v)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-ops-card bg-ops-surface px-3.5 py-2 text-xs font-semibold text-ops-ink transition hover:border-ops-accent/50 hover:text-ops-accent"
          >
            <Map className="h-3.5 w-3.5" />
            {showMap ? "Masquer carte" : "Choisir sur carte"}
          </button>
          <button
            type="button"
            onClick={() => void captureMyLocation()}
            disabled={locating || permission === "unsupported"}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-ops-card bg-ops-surface px-3.5 py-2 text-xs font-semibold text-ops-ink transition hover:border-ops-accent/50 hover:text-ops-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {locating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Crosshair className="h-3.5 w-3.5" />
            )}
            {locating ? "Localisation…" : "Ma position"}
          </button>
        </div>
      </div>

      {showQuality ? (
        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            quality.level === "strong"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : quality.level === "ok"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                : "border-ops-accent/40 bg-ops-accent/10 text-ops-ink"
          }`}
        >
          <p className="font-semibold">
            Qualité adresse · {quality.score}/100
            {quality.level === "strong"
              ? " — solide"
              : quality.level === "ok"
                ? " — correcte"
                : " — à préciser"}
          </p>
          {quality.warnings.length > 0 ? (
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-[11px] opacity-90">
              {quality.warnings.slice(0, 3).map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[11px]">
              Adresse suffisamment précise pour la livraison.
            </p>
          )}
        </div>
      ) : null}

      {showMap ? (
        <MapPinPicker
          lat={value.lat ?? null}
          lng={value.lng ?? null}
          onPick={(coords) => {
            onChange({
              ...value,
              lat: coords.lat,
              lng: coords.lng,
              accuracyMeters: null,
            });
            setGeoMessage(
              `Pin carte · ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`,
            );
            void reverseGeocodeTunisia(coords.lat, coords.lng).then((place) => {
              if (!place) return;
              onChange({
                governorate: place.governorate || value.governorate,
                city: place.city || value.city,
                locality: place.locality ?? value.locality,
                address: place.street || value.address || place.label,
                lat: coords.lat,
                lng: coords.lng,
                accuracyMeters: null,
              });
              setSearchQuery(place.label);
            });
          }}
        />
      ) : null}

      {geoMessage ? (
        <p className="rounded-lg border border-ops-card bg-ops-ink/[0.05] px-3 py-2 text-xs text-ops-ink">
          {geoMessage}
          {value.lat != null && value.lng != null ? (
            <span className="mt-1 block font-mono text-[10px] text-ops-ink/50">
              {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
              {value.accuracyMeters != null
                ? ` · ±${Math.round(value.accuracyMeters)} m`
                : ""}
            </span>
          ) : null}
        </p>
      ) : null}

      <div className="relative">
        <label
          htmlFor={searchId}
          className="mb-1.5 block text-sm font-medium text-ops-ink"
        >
          Recherche d’adresse
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ops-ink/50" />
          <input
            id={searchId}
            value={searchQuery}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Ex. Avenue Habib Bourguiba, La Marsa…"
            className={`${fieldClass} pl-9 pr-9`}
            onFocus={() => setSearchOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onKeyDown={onSearchKeyDown}
            role="combobox"
            aria-expanded={searchOpen}
            aria-controls={`${searchId}-list`}
            aria-autocomplete="list"
          />
          {searching ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ops-ink/50" />
          ) : null}
        </div>
        {searchOpen && suggestions.length > 0 ? (
          <ul
            id={`${searchId}-list`}
            role="listbox"
            className="absolute z-40 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-ops-card bg-ops-surface py-1 shadow-ops"
          >
            {suggestions.map((hit, index) => (
              <li
                key={hit.id}
                role="option"
                aria-selected={index === activeIndex}
              >
                <button
                  type="button"
                  className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition ${
                    index === activeIndex
                      ? "bg-ops-accent/15 text-ops-accent"
                      : "text-ops-ink hover:bg-ops-ink/[0.06]"
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applySuggestion(hit)}
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span>
                    <span className="block font-medium">{hit.label}</span>
                    <span className="text-[11px] text-ops-ink/50">
                      {hit.source === "photon"
                        ? "Carte"
                        : hit.source === "cache"
                          ? "Hors-ligne"
                          : "Tunisie"}{" "}
                      · {bilingualLabel(displayGovernorate(hit.governorate), hit.governorate)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div
        className={`grid gap-3 ${compact ? "sm:grid-cols-1" : "sm:grid-cols-2"}`}
      >
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ops-ink">
            Gouvernorat
            {required ? <span className="text-ops-accent"> *</span> : null}
          </label>
          <select
            name="governorate"
            required={required}
            value={value.governorate}
            onChange={(e) =>
              onChange({
                ...value,
                governorate: e.target.value,
                city: "",
                locality: "",
                lat: null,
                lng: null,
                accuracyMeters: null,
              })
            }
            className={fieldClass}
          >
            <option value="">Sélectionner</option>
            {GOVERNORATES.map((g) => (
              <option key={g} value={g}>
                {bilingualLabel(displayGovernorate(g), g)}
              </option>
            ))}
          </select>
        </div>
        <AutocompleteField
          label="Ville"
          name="city"
          value={value.city}
          options={cityOptions}
          extraOptions={remoteCities}
          onQueryChange={setCityQuery}
          onChange={(city) =>
            onChange({
              ...value,
              city:
                resolveOfficialCity(value.governorate, city) ?? city,
              locality: "",
            })
          }
          disabled={!value.governorate}
          required={required}
          allowCustom
          bilingual
          governorateKey={value.governorate}
          placeholder="Délégation — tapez pour filtrer"
        />
        <div className={compact ? undefined : "sm:col-span-2"}>
          <AutocompleteField
            label="Localité / quartier"
            name="locality"
            value={value.locality}
            options={localityOptions}
            extraOptions={remoteLocalities}
            onQueryChange={setLocalityQuery}
            onChange={(locality) => onChange({ ...value, locality })}
            disabled={!value.governorate || !value.city}
            allowCustom
            bilingual
            governorateKey={value.governorate}
            placeholder={
              value.city
                ? "Quartier, village — liste + recherche"
                : "Choisir une ville d’abord"
            }
          />
        </div>
        {showStreet ? (
          <div className={compact ? undefined : "sm:col-span-2"}>
            <label className="mb-1.5 block text-sm font-medium text-ops-ink">
              Adresse complète
              {required ? <span className="text-ops-accent"> *</span> : null}
            </label>
            <input
              name="address"
              required={required}
              value={value.address}
              autoComplete="street-address"
              placeholder="Rue, numéro, immeuble, repère…"
              className={fieldClass}
              onChange={(e) =>
                onChange({
                  ...value,
                  address: e.target.value,
                })
              }
            />
          </div>
        ) : null}
      </div>

      <input type="hidden" name="lat" value={value.lat ?? ""} />
      <input type="hidden" name="lng" value={value.lng ?? ""} />
      <input
        type="hidden"
        name="accuracyMeters"
        value={value.accuracyMeters ?? ""}
      />
    </div>
  );
}
