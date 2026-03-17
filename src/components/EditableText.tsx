import React, { useState, useRef, useEffect } from 'react';

interface EditableTextProps {
  text: string;
  onTextChange: (newText: string) => void;
  element?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span' | 'div';
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  isSelected?: boolean;
  disabled?: boolean;
  id?: string;
  isEditing?: boolean;
  onToggleEditing?: (isEditing: boolean) => void;
  [key: string]: any;
}

export function EditableText({
  text,
  onTextChange,
  element = 'p',
  className = '',
  style,
  placeholder = '',
  isSelected = false,
  disabled = false,
  id,
  isEditing: externalIsEditing,
  onToggleEditing,
  ...props
}: EditableTextProps) {
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const isEditing = externalIsEditing !== undefined ? externalIsEditing : internalIsEditing;

  const setIsEditing = (value: boolean) => {
    if (onToggleEditing) {
      onToggleEditing(value);
    } else {
      setInternalIsEditing(value);
    }
  };

  const textRef = useRef<HTMLElement>(null);
  const displayText = text || placeholder;

  useEffect(() => {
    if (textRef.current) {
      if (isEditing) {
        if (textRef.current.textContent !== text) {
          textRef.current.textContent = text;
        }
      } else {
        textRef.current.textContent = displayText;
      }
    }
  }, [text, placeholder, isEditing, displayText]);

  useEffect(() => {
    if (isEditing && textRef.current) {
      textRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(textRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [isEditing]);

  const saveCursorPosition = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && textRef.current) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(textRef.current);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      return preCaretRange.toString().length;
    }
    return 0;
  };

  const restoreCursorPosition = (position: number) => {
    if (!textRef.current) return;

    const textNode = textRef.current.firstChild;
    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      const range = document.createRange();
      const selection = window.getSelection();
      const maxPosition = Math.min(position, textNode.textContent?.length || 0);

      range.setStart(textNode, maxPosition);
      range.setEnd(textNode, maxPosition);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Allow click-to-edit when selected
    if (isSelected && !isEditing && !disabled) {
      e.stopPropagation();
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    // Double-click to edit (works even if not selected)
    if (!isEditing && !disabled) {
      e.stopPropagation();
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    const newText = textRef.current?.textContent || '';
    if (newText.trim() === '') {
      // If empty, restore original text or placeholder
      if (textRef.current) {
        textRef.current.textContent = text || placeholder;
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      textRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // Restore original text and exit editing
      if (textRef.current) {
        textRef.current.textContent = text || placeholder;
      }
      textRef.current?.blur();
    }
  };

  const handleInput = (e: React.FormEvent) => {
    const newText = textRef.current?.textContent || '';
    onTextChange(newText);
  };

  const Element = element;

  return (
    <Element
      id={id}
      {...props}
      ref={textRef as any}
      className={`${className} ${isEditing ? 'outline-none ring-2 ring-blue-500 ring-offset-1 bg-blue-50/50 dark:bg-blue-950/30' : ''} ${!isEditing && !disabled ? 'cursor-text hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors' : ''
        }`}
      style={{
        ...style,
        minHeight: isEditing ? '1.5em' : undefined,
        wordBreak: 'break-word',
        minWidth: isEditing ? '2ch' : undefined,
        borderRadius: isEditing ? '4px' : undefined,
        padding: isEditing ? '2px 4px' : style?.padding,
        userSelect: isEditing ? 'text' : undefined
      }}
      contentEditable={isEditing && !disabled}
      suppressContentEditableWarning={true}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onInput={handleInput}
      title={!isEditing && !disabled ? '✏️ Double-click to edit text' : undefined}
    >
    </Element>
  );
}
