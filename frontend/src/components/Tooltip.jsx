import React from 'react';

export default function Tooltip({ text }) {
  return (
    <span className="tooltip" role="img" aria-label={text} tabIndex={0}>
      i
      <span className="tooltip-text" role="status">{text}</span>
    </span>
  );
}
