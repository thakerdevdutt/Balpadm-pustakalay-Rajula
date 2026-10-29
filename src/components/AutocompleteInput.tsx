import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface AutocompleteInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  onEnterJump?: () => void;
  disabled?: boolean;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  id,
  value,
  onChange,
  options = [],
  placeholder = '',
  className = '',
  onEnterJump,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listboxId = useId();

  // Deduplicate and filter options based on current input value
  const cleanOptions = Array.from(new Set(options.map((o) => (o || '').trim()).filter(Boolean)));
  
  const filteredOptions = value.trim()
    ? cleanOptions.filter((opt) => opt.toLowerCase().includes(value.toLowerCase()))
    : cleanOptions;

  // Move focus to next form field
  const triggerNextFieldFocus = () => {
    if (onEnterJump) {
      onEnterJump();
      return;
    }

    if (!inputRef.current) return;
    const container = document.getElementById('frame-1-book-entry') || inputRef.current.closest('form') || inputRef.current.closest('section');
    if (container) {
      const focusables = Array.from(
        container.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>(
          'input:not([readonly]):not([disabled]):not([type="hidden"]), select:not([disabled]), button#BTN_Save_Update_Click'
        )
      );
      const index = focusables.indexOf(inputRef.current);
      if (index >= 0 && index < focusables.length - 1) {
        (focusables[index + 1] as HTMLElement).focus();
      } else {
        const saveBtn = document.getElementById('BTN_Save_Update_Click');
        if (saveBtn) {
          saveBtn.focus();
        }
      }
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Scroll active item into view when highlightedIndex changes
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const activeElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelectOption = (selectedVal: string, shouldAdvanceFocus = true) => {
    onChange(selectedVal);
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (shouldAdvanceFocus) {
      // Small timeout ensures react state updates before jumping
      setTimeout(() => {
        triggerNextFieldFocus();
      }, 20);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ignore during IME composition (Gujarati script typing)
    if (e.nativeEvent.isComposing) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
      } else if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(filteredOptions.length > 0 ? filteredOptions.length - 1 : -1);
      } else if (filteredOptions.length > 0) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        // Option selected via arrow keys -> apply selected value and IMMEDIATELY advance to next field!
        const selected = filteredOptions[highlightedIndex];
        handleSelectOption(selected, true);
      } else {
        // No option highlighted or dropdown closed -> commit typed text and IMMEDIATELY advance to next field!
        setIsOpen(false);
        setHighlightedIndex(-1);
        triggerNextFieldFocus();
      }
    } else if (e.key === 'Tab') {
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        onChange(filteredOptions[highlightedIndex]);
      }
      setIsOpen(false);
      setHighlightedIndex(-1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          disabled={disabled}
          autoComplete="off"
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            // Open suggestions on focus or click
            if (cleanOptions.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={listboxId}
          className={
            className ||
            'w-full bg-slate-900 border border-slate-700 px-2 py-1.5 pr-7 rounded text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none'
          }
        />
        {cleanOptions.length > 0 && !disabled && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              setIsOpen((prev) => !prev);
              if (!isOpen && inputRef.current) {
                inputRef.current.focus();
              }
            }}
            className="absolute right-1 text-slate-400 hover:text-slate-200 p-1 focus:outline-none"
            title="ઓપ્શન્સ જુઓ"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
          </button>
        )}
      </div>

      {/* Suggestion Dropdown List */}
      {isOpen && filteredOptions.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-slate-900 border border-slate-700 rounded-md shadow-2xl divide-y divide-slate-800 text-xs"
        >
          <ul ref={listRef} className="py-1">
            {filteredOptions.map((option, idx) => {
              const isHighlighted = idx === highlightedIndex;
              const isSelected = option.toLowerCase() === value.trim().toLowerCase();

              return (
                <li
                  key={`${option}-${idx}`}
                  role="option"
                  aria-selected={isHighlighted || isSelected}
                  onMouseDown={(e) => {
                    // onMouseDown prevents input from losing focus prematurely before select
                    e.preventDefault();
                    handleSelectOption(option, true);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`px-3 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                    isHighlighted
                      ? 'bg-blue-600 text-white font-medium'
                      : isSelected
                      ? 'bg-slate-800 text-blue-300 font-medium'
                      : 'text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{option}</span>
                  {isSelected && (
                    <Check className={`w-3.5 h-3.5 shrink-0 ${isHighlighted ? 'text-white' : 'text-blue-400'}`} />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
