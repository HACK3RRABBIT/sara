import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { chargeAmount, faNum, parseAmount, money } from "@/lib/format";
import type { Settings, Unit } from "@/lib/store";

export function UnitForm({
  unit,
  settings,
  onSave,
  onDelete,
  submitLabel = "ذخیره مشخصات",
}: {
  unit: Unit;
  settings: Settings;
  onSave: (patch: Omit<Unit, "id">) => void;
  onDelete?: () => void;
  submitLabel?: string;
}) {
  const [number, setNumber] = useState(unit.number);
  const [floor, setFloor] = useState(String(unit.floor));
  const [resident, setResident] = useState(unit.resident);
  const [phone, setPhone] = useState(unit.phone);
  const [occupants, setOccupants] = useState(String(unit.occupants));
  const [occupied, setOccupied] = useState(unit.occupied);
  const [note, setNote] = useState(unit.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setNumber(unit.number);
    setFloor(String(unit.floor));
    setResident(unit.resident);
    setPhone(unit.phone);
    setOccupants(String(unit.occupants));
    setOccupied(unit.occupied);
    setNote(unit.note ?? "");
    setError(null);
    setSaved(false);
    setConfirmDelete(false);
  }, [unit.id]);

  const people = Math.max(0, Math.round(parseAmount(occupants) || 0));
  const nextCharge = chargeAmount(settings.baseCharge, settings.perPerson, people);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const name = number.trim();
    if (!name) {
      setError("شماره یا نام واحد را بنویسید.");
      return;
    }
    onSave({
      number: name,
      floor: Math.max(0, Math.round(parseAmount(floor) || 0)),
      resident: resident.trim(),
      phone: phone.trim(),
      occupants: people,
      occupied,
      note: note.trim(),
    });
    setError(null);
    setSaved(true);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`u-number-${unit.id}`}>شماره یا نام واحد</Label>
          <Input
            id={`u-number-${unit.id}`}
            value={number}
            onChange={(event) => {
              setNumber(event.target.value);
              setSaved(false);
            }}
            placeholder="۱ تا ۱۰"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`u-floor-${unit.id}`}>طبقه</Label>
          <Input
            id={`u-floor-${unit.id}`}
            inputMode="numeric"
            value={floor}
            onChange={(event) => {
              setFloor(event.target.value);
              setSaved(false);
            }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`u-res-${unit.id}`}>نام ساکن</Label>
        <Input
          id={`u-res-${unit.id}`}
          value={resident}
          onChange={(event) => {
            setResident(event.target.value);
            setSaved(false);
          }}
          placeholder="نام خانوادگی یا ساکن فعلی"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`u-phone-${unit.id}`}>موبایل</Label>
          <Input
            id={`u-phone-${unit.id}`}
            value={phone}
            dir="ltr"
            inputMode="tel"
            onChange={(event) => {
              setPhone(event.target.value);
              setSaved(false);
            }}
            placeholder="0912…"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`u-people-${unit.id}`}>تعداد نفرات</Label>
          <Input
            id={`u-people-${unit.id}`}
            inputMode="numeric"
            value={occupants}
            onChange={(event) => {
              setOccupants(event.target.value);
              setSaved(false);
            }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`u-note-${unit.id}`}>توضیح</Label>
        <Input
          id={`u-note-${unit.id}`}
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
            setSaved(false);
          }}
          placeholder="مالک، مستأجر، خالی، …"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        شارژ ماه بعد: {money(nextCharge)} — پایه {money(settings.baseCharge)} + {faNum(people)} نفر ×{" "}
        {money(settings.perPerson)}
      </p>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={occupied}
          onChange={(event) => {
            setOccupied(event.target.checked);
            setSaved(false);
          }}
          className="size-4 accent-foreground"
        />
        واحد ساکن دارد
      </label>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm" role="status">
          ذخیره شد. از این به بعد با همین مشخصات می‌ماند.
        </p>
      ) : null}
      <Button type="submit" size="lg">
        {submitLabel}
      </Button>
      {onDelete ? (
        confirmDelete ? (
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setConfirmDelete(false)}>
              انصراف
            </Button>
            <Button type="button" className="flex-1" onClick={onDelete}>
              واحد حذف شود
            </Button>
          </div>
        ) : (
          <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)}>
            حذف این واحد
          </Button>
        )
      ) : null}
    </form>
  );
}
