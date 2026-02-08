
import React, { memo, Fragment } from 'react';

interface TreatmentTextRendererProps {
  value: string;
  placeholder?: string;
  isActiveRow: boolean;
  activeStepIndex: number;
  activeStepColor?: string;
}

export const TreatmentTextRenderer: React.FC<TreatmentTextRendererProps> = memo(({
  value,
  placeholder,
  isActiveRow,
  activeStepIndex,
  activeStepColor
}) => {
  if (!value) {
    return (
      <span className="text-gray-400 italic font-bold">
        {placeholder}
      </span>
    );
  }

  // 활성화 상태이고 단계 인덱스가 유효할 때: 텍스트를 분리하여 하이라이팅
  if (isActiveRow && activeStepIndex >= 0) {
    const parts = value.split('/');
    return (
      <>
        {parts.map((part, i) => (
          <Fragment key={i}>
            <span className={i === activeStepIndex ? `${activeStepColor} transition-colors duration-300` : 'text-gray-700 dark:text-gray-300'}>
              {part.trim()}
            </span>
            {i < parts.length - 1 && <span className="text-gray-400 mx-0.5">/</span>}
          </Fragment>
        ))}
      </>
    );
  }

  // 기본 상태: 전체 텍스트 표시 (활성 단계 색상이 있으면 적용)
  return (
    <span className={activeStepColor || 'text-gray-700 dark:text-gray-300'}>
      {value}
    </span>
  );
});
