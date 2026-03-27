
import React, { useCallback } from 'react';
import { BedState, BedStatus, Preset, TreatmentStep, QuickTreatment, PatientVisit } from '../types';
import { findMatchingPreset, parseTreatmentString, generateTreatmentString } from '../utils/bedUtils';

const STEP_STATUS_KEYWORDS: Record<'isInjection' | 'isFluid' | 'isTraction' | 'isESWT' | 'isManual' | 'isIon' | 'isExercise', string[]> = {
    isInjection: ['주사', 'inj', 'injection'],
    isFluid: ['수액', 'fluid', 'iv'],
    isTraction: ['견인', 'traction'],
    isESWT: ['충격파', 'eswt', 'shockwave'],
    isManual: ['도수', 'manual'],
    isIon: ['이온', 'ion'],
    isExercise: ['운동', 'exercise', 'ex']
};

const normalizeStepText = (step: TreatmentStep) => `${step.name ?? ''} ${step.label ?? ''}`.toLowerCase();

const hasStatusKeyword = (steps: TreatmentStep[], statusKey: keyof typeof STEP_STATUS_KEYWORDS) => {
    const keywords = STEP_STATUS_KEYWORDS[statusKey];
    return steps.some((step) => {
        const text = normalizeStepText(step);
        return keywords.some((keyword) => text.includes(keyword));
    });
};

export const useBedIntegration = (
    bedsRef: React.MutableRefObject<BedState[]>,
    updateBedState: (id: number, updates: Partial<BedState>) => void,
    presets: Preset[],
    quickTreatments: QuickTreatment[],
    clearBed: (id: number) => void,
    onUpdateVisit?: (bedId: number, updates: Partial<PatientVisit>) => void
) => {

    const updateBedMemoFromLog = useCallback((bedId: number, memo?: string) => {
        const bed = bedsRef.current.find(b => b.id === bedId);
        if (!bed || bed.status === BedStatus.IDLE) return;

        updateBedState(bedId, { patientMemo: memo || undefined });
    }, [bedsRef, updateBedState]);

    const updateBedFlagsFromLog = useCallback((bedId: number, visit: Partial<PatientVisit>) => {
        const bed = bedsRef.current.find(b => b.id === bedId);
        if (!bed || bed.status === BedStatus.IDLE) return;

        const flagUpdates: Partial<BedState> = {};
        if (visit.is_injection !== undefined) flagUpdates.isInjection = !!visit.is_injection;
        if (visit.is_fluid !== undefined) flagUpdates.isFluid = !!visit.is_fluid;
        if (visit.is_traction !== undefined) flagUpdates.isTraction = !!visit.is_traction;
        if (visit.is_eswt !== undefined) flagUpdates.isESWT = !!visit.is_eswt;
        if (visit.is_manual !== undefined) flagUpdates.isManual = !!visit.is_manual;
        if (visit.is_ion !== undefined) flagUpdates.isIon = !!visit.is_ion;
        if (visit.is_exercise !== undefined) flagUpdates.isExercise = !!visit.is_exercise;

        if (Object.keys(flagUpdates).length === 0) return;
        updateBedState(bedId, flagUpdates);
    }, [bedsRef, updateBedState]);

    const overrideBedFromLog = useCallback((bedId: number, visit: PatientVisit, forceRestart: boolean) => {
        const treatmentName = visit.treatment_name || "";
        const matchingPreset = findMatchingPreset(presets, treatmentName, quickTreatments);

        let steps: TreatmentStep[] = [];
        let currentPresetId: string | null = null;
        let customPreset: any = null;

        if (matchingPreset) {
            const stablePreset = {
                ...matchingPreset,
                steps: matchingPreset.steps.map((step) => ({ ...step }))
            };
            steps = stablePreset.steps;
            customPreset = stablePreset;
            if (!matchingPreset.id.startsWith('restored-')) {
                currentPresetId = matchingPreset.id;
            }
        } else {
            steps = parseTreatmentString(treatmentName, quickTreatments);
            if (steps.length > 0) {
                customPreset = { id: `log-restore-${Date.now()}`, name: treatmentName, steps };
            }
        }

        if (steps.length === 0) return;

        const bed = bedsRef.current.find(b => b.id === bedId);
        if (!bed) return;

        const currentSteps = bed.customPreset?.steps || presets.find(p => p.id === bed.currentPresetId)?.steps || [];
        const isStepsChanged = JSON.stringify(steps) !== JSON.stringify(currentSteps);

        const updates: Partial<BedState> = {
            isInjection: visit.is_injection || false,
            isFluid: visit.is_fluid || false,
            isTraction: visit.is_traction || false,
            isESWT: visit.is_eswt || false,
            isManual: visit.is_manual || false,
            isIon: visit.is_ion || false,
            isExercise: visit.is_exercise || false,
            isInjectionCompleted: visit.is_injection_completed || false,
            patientMemo: visit.memo || undefined,
        };

        if (forceRestart || bed.status !== BedStatus.ACTIVE) {
            const firstStep = steps[0];
            updates.status = BedStatus.ACTIVE;
            updates.currentPresetId = currentPresetId;
            updates.customPreset = customPreset;
            updates.currentStepIndex = 0;
            updates.queue = [];
            updates.startTime = Date.now();
            updates.remainingTime = firstStep ? firstStep.duration : 0;
            updates.originalDuration = firstStep ? firstStep.duration : 0;
            updates.isPaused = false;
        } else if (isStepsChanged) {
            // 활성 배드에서 로그의 처방 목록만 변경된 경우,
            // 타이머 런타임은 유지하고 목록/프리셋 정보만 갱신한다.
            const clampedStepIndex = Math.max(0, Math.min(bed.currentStepIndex, steps.length - 1));
            updates.currentPresetId = currentPresetId;
            updates.customPreset = customPreset;
            if (clampedStepIndex !== bed.currentStepIndex) {
                updates.currentStepIndex = clampedStepIndex;
            }
        }

        updateBedState(bedId, updates);


    }, [presets, quickTreatments, updateBedState, onUpdateVisit]);

    const moveBedState = useCallback(async (fromBedId: number, toBedId: number, sourceSnapshot?: BedState) => {
        const fromBed = sourceSnapshot || bedsRef.current.find(b => b.id === fromBedId);
        if (!fromBed) return;

        const stateToMove: Partial<BedState> = {
            status: fromBed.status,
            currentPresetId: fromBed.currentPresetId,
            customPreset: fromBed.customPreset,
            currentStepIndex: fromBed.currentStepIndex,
            queue: fromBed.queue,
            startTime: fromBed.startTime,
            remainingTime: fromBed.remainingTime,
            originalDuration: fromBed.originalDuration,
            isPaused: fromBed.isPaused,
            isInjection: fromBed.isInjection,
            isFluid: fromBed.isFluid,
            isTraction: fromBed.isTraction,
            isESWT: fromBed.isESWT,
            isManual: fromBed.isManual,
            isIon: fromBed.isIon,
            isExercise: fromBed.isExercise,
            isInjectionCompleted: fromBed.isInjectionCompleted,
            patientMemo: fromBed.patientMemo,
        };

        // 1) 먼저 대상 배드에 상태를 복원
        await updateBedState(toBedId, stateToMove);
        // 2) 원본 배드를 비우고
        clearBed(fromBedId);
        // 3) clear/realtime 레이스로 대상이 잠깐 비워지는 경우를 방지하기 위해
        //    동일 스냅샷을 한 번 더 덮어써 최종 상태를 고정한다.
        await updateBedState(toBedId, stateToMove);
    }, [updateBedState, clearBed, bedsRef]);

    const updateBedSteps = useCallback((bedId: number, newSteps: TreatmentStep[], newStepIndex?: number) => {
        const bed = bedsRef.current.find(b => b.id === bedId);
        if (!bed) return;

        const oldSteps = bed.customPreset?.steps || presets.find(p => p.id === bed.currentPresetId)?.steps || [];
        // Use provided index or keep the current one, clamped to valid range
        const currentIdx = newStepIndex !== undefined
            ? Math.max(0, Math.min(newStepIndex, newSteps.length - 1))
            : bed.currentStepIndex;

        const oldCurrentStep = oldSteps[bed.currentStepIndex];
        const newCurrentStep = newSteps[currentIdx];

        const isCurrentStepChanged = !newCurrentStep ||
            !oldCurrentStep ||
            newCurrentStep.id !== oldCurrentStep.id ||
            newCurrentStep.duration !== oldCurrentStep.duration;

        const updates: Partial<BedState> = {
            customPreset: { id: `custom-edit-${Date.now()}`, name: '치료(수정됨)', steps: newSteps },
            currentStepIndex: currentIdx
        };

        if (isCurrentStepChanged) {
            if (newCurrentStep) {
                updates.remainingTime = newCurrentStep.duration;
                updates.originalDuration = newCurrentStep.duration;
                updates.startTime = Date.now();
                updates.isPaused = false;
            } else {
                updates.status = BedStatus.COMPLETED;
                updates.remainingTime = 0;
            }
        }

        const statusAutoUpdates: Partial<BedState> = {};
        const visitStatusAutoUpdates: Partial<Pick<PatientVisit, 'is_injection' | 'is_fluid' | 'is_traction' | 'is_eswt' | 'is_manual' | 'is_ion' | 'is_exercise'>> = {};

        (Object.keys(STEP_STATUS_KEYWORDS) as Array<keyof typeof STEP_STATUS_KEYWORDS>).forEach((statusKey) => {
            const hadKeywordBefore = hasStatusKeyword(oldSteps, statusKey);
            const hasKeywordNow = hasStatusKeyword(newSteps, statusKey);

            // 자동 상태표시 아이콘: 목록에 해당 항목이 새롭게 생긴 순간에만 ON
            // (삭제해도 유지, 수동 OFF는 존중)
            if (!hadKeywordBefore && hasKeywordNow && !bed[statusKey]) {
                statusAutoUpdates[statusKey] = true;
                const visitMap: Record<keyof typeof STEP_STATUS_KEYWORDS, 'is_injection' | 'is_fluid' | 'is_traction' | 'is_eswt' | 'is_manual' | 'is_ion' | 'is_exercise'> = {
                    isInjection: 'is_injection',
                    isFluid: 'is_fluid',
                    isTraction: 'is_traction',
                    isESWT: 'is_eswt',
                    isManual: 'is_manual',
                    isIon: 'is_ion',
                    isExercise: 'is_exercise'
                };
                visitStatusAutoUpdates[visitMap[statusKey]] = true;
            }
        });

        Object.assign(updates, statusAutoUpdates);

        updateBedState(bedId, updates);

        if (onUpdateVisit) {
            onUpdateVisit(bedId, {
                treatment_name: generateTreatmentString(newSteps),
                ...visitStatusAutoUpdates
            });
        }
    }, [presets, updateBedState, onUpdateVisit]);

    return {
        overrideBedFromLog,
        moveBedState,
        updateBedSteps,
        updateBedMemoFromLog,
        updateBedFlagsFromLog
    };
};
