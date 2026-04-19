const frame = document.getElementById("frame");
const items = frame.querySelectorAll(".object");

items.forEach((item) => {
    item.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        item.setPointerCapture(e.pointerId);

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

const dragHint = document.querySelector(".drag-hint");

const getObjClass = (item) => [...item.classList].find((cls) => /^obj\d+$/.test(cls));

const isOverlappingHint = (item, hint) => {
    const itemRect = item.getBoundingClientRect();
    const hintRect = hint.getBoundingClientRect();

    return !(
        itemRect.right < hintRect.left ||
        itemRect.left > hintRect.right ||
        itemRect.bottom < hintRect.top ||
        itemRect.top > hintRect.bottom
    );
};

const updateObjScale = (item) => {
    if (!dragHint) return false;

    const overlapping = isOverlappingHint(item, dragHint);
    item.style.transition = "scale 0.05s ease-in-out";
    item.style.scale = overlapping ? "0.5" : "1";
    return overlapping;
};

items.forEach((item) => {
    const objClass = getObjClass(item);
    if (!objClass) return;

    // Apply scaling live while dragging/moving
    item.addEventListener("pointermove", () => {
        updateObjScale(item);
    });

    // Keep drop behavior + redirect check
    item.addEventListener("pointerup", () => {
        const isOverlapping = updateObjScale(item);

        if (isOverlapping) {
            const objNumber = objClass.match(/\d+/)?.[0];
            console.log(`Redirect! obj${objNumber}`);
        }
    });
});

