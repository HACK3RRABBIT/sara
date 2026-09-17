import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { MONTHS_FA, faNum, isoToJalali, jalaliToIso, monthLength } from "@/lib/format";

export function JalaliDateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (iso: string) => void;
}) {
  const j = isoToJalali(value);
  const days = monthLength(j.year, j.month);
  const years = [j.year - 1, j.year, j.year + 1];

  function update(next: { year?: number; month?: number; day?: number }) {
    const year = next.year ?? j.year;
    const month = next.month ?? j.month;
    const max = monthLength(year, month);
    const day = Math.min(next.day ?? j.day, max);
    onChange(jalaliToIso(year, month, day));
  }

  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label htmlFor={`${id}-day`} className="sr-only">
            روز
          </Label>
          <NativeSelect
            id={`${id}-day`}
            value={j.day}
            onChange={(event) => update({ day: Number(event.target.value) })}
          >
            {Array.from({ length: days }, (_, index) => index + 1).map((day) => (
              <option key={day} value={day}>
                {faNum(day)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor={`${id}-month`} className="sr-only">
            ماه
          </Label>
          <NativeSelect
            id={`${id}-month`}
            value={j.month}
            onChange={(event) => update({ month: Number(event.target.value) })}
          >
            {MONTHS_FA.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div>
          <Label htmlFor={`${id}-year`} className="sr-only">
            سال
          </Label>
          <NativeSelect
            id={`${id}-year`}
            value={j.year}
            onChange={(event) => update({ year: Number(event.target.value) })}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {faNum(year)}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
    </fieldset>
  );
}
