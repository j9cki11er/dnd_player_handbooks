export function isDialogBackdropClick(event, dialog = event.currentTarget) {
    if (event.target !== dialog) return false;
    const { left, right, top, bottom } = dialog.getBoundingClientRect();
    return event.clientX < left || event.clientX >= right ||
        event.clientY < top || event.clientY >= bottom;
}
