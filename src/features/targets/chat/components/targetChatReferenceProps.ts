import type { TargetChatViewBodyProps } from '@/features/targets/chat/components/TargetChatViewBody.types';

export function getComposerReferenceProps(props: TargetChatViewBodyProps) {
  return {
    composerReferences: props.composerReferences,
    dismissReferenceMenu: props.dismissReferenceMenu,
    handleComposerInputChange: props.handleComposerInputChange,
    isReferenceMenuOpen: props.isReferenceMenuOpen,
    referenceActiveIndex: props.referenceActiveIndex,
    referenceMenuId: props.referenceMenuId,
    referencePickerItems: props.referencePickerItems,
    referenceQuery: props.referenceQuery,
    removeComposerReference: props.removeComposerReference,
    setReferenceActiveIndex: props.setReferenceActiveIndex,
    selectComposerReference: props.selectComposerReference
  };
}
