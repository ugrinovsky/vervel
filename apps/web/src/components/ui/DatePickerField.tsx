import { forwardRef, type InputHTMLAttributes } from 'react';
import DatePicker, { registerLocale, type DatePickerProps } from 'react-datepicker';
import { ru } from 'date-fns/locale';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import 'react-datepicker/dist/react-datepicker.css';
import '@/styles/datepicker.css';
import { pickerFieldClasses } from '@/components/ui/inputStyles';
import { PickerFieldShell } from '@/components/ui/pickerField';

registerLocale('ru', ru);

const DatePickerControl = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function DatePickerControl({ className = '', style, ...props }, ref) {
    return (
      <PickerFieldShell icon={CalendarDaysIcon}>
        <input
          ref={ref}
          {...props}
          readOnly
          className={pickerFieldClasses({ className })}
          style={{ outline: 'none', ...style }}
        />
      </PickerFieldShell>
    );
  },
);

DatePickerControl.displayName = 'DatePickerControl';

type SingleDatePickerProps = Extract<
  DatePickerProps,
  { selectsRange?: false | undefined; selectsMultiple?: false | undefined }
>;

export type DatePickerFieldProps = Omit<SingleDatePickerProps, 'customInput'>;

/** Единый датапикер приложения (react-datepicker + CalendarDaysIcon). */
export default function DatePickerField({
  locale = 'ru',
  calendarClassName = 'dark-datepicker',
  popperPlacement = 'bottom-start',
  portalId = 'datepicker-portal',
  wrapperClassName = 'w-full min-w-0',
  selected,
  onChange,
  ...props
}: DatePickerFieldProps) {
  return (
    <DatePicker
      {...props}
      locale={locale}
      calendarClassName={calendarClassName}
      popperPlacement={popperPlacement}
      portalId={portalId}
      wrapperClassName={wrapperClassName}
      selectsMultiple={false}
      selectsRange={false}
      selected={selected}
      onChange={onChange}
      customInput={<DatePickerControl />}
    />
  );
}
