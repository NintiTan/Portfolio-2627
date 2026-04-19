const frame = document.getElementById("frame");
const items = frame.querySelectorAll(".object");

// Start from current highest z-index in the frame
let topZ = Math.max(
    0,
    ...[...items].map((el) => parseInt(getComputedStyle(el).zIndex, 10) || 0)
);

items.forEach((item) => {
    item.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        item.setPointerCapture(e.pointerId);

        // Bring dragged item to front
        item.style.zIndex = String(++topZ);

        const isObjClass = [...item.classList].some((cls) => /^obj\d+$/.test(cls));

        // Animate rotation changes while drag starts/ends
        if (isObjClass) {
            item.style.transition = "transform 0.05s ease-in-out";
            item.style.transform = "rotate(0deg)";
        }

        const frameRect = frame.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();

        const offsetX = e.clientX - itemRect.left;
        const offsetY = e.clientY - itemRect.top;

        const onMove = (ev) => {
            let x = ev.clientX - frameRect.left - offsetX;
            let y = ev.clientY - frameRect.top - offsetY;

            x = Math.max(0, Math.min(x, frame.clientWidth - item.offsetWidth));
            y = Math.max(0, Math.min(y, frame.clientHeight - item.offsetHeight));

            item.style.left = `${x}px`;
            item.style.top = `${y}px`;
        };

        const onUp = (ev) => {
            item.releasePointerCapture(ev.pointerId);
            item.removeEventListener("pointermove", onMove);
            item.removeEventListener("pointerup", onUp);
            item.removeEventListener("pointercancel", onUp);

            // Animate back to CSS rotation
            if (isObjClass) {
                item.style.transform = "";
            }
        };

        item.addEventListener("pointermove", onMove);
        item.addEventListener("pointerup", onUp);
        item.addEventListener("pointercancel", onUp);
    });
});
