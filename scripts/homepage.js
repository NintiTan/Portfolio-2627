const items = document.querySelectorAll(".object, .little-me, .big-me");

// Start from current highest z-index in the page
let topZ = Math.max(
    0,
    ...[...items].map((el) => parseInt(getComputedStyle(el).zIndex, 10) || 0)
);

items.forEach((item) => {
    item.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        item.setPointerCapture(e.pointerId);

        item.style.zIndex = String(++topZ);

        const isObjClass = [...item.classList].some((cls) => /^obj\d+$/.test(cls));

        if (isObjClass) {
            item.style.transition = "transform 0.05s ease-in-out";
            item.style.transform = "rotate(0deg)";
        }

        const container = item.closest(".frame-wrap, .flexbox") || document.body;
        const containerRect = container.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();

        const offsetX = e.clientX - itemRect.left;
        const offsetY = e.clientY - itemRect.top;

        const onMove = (ev) => {
            let x = ev.clientX - containerRect.left - offsetX;
            let y = ev.clientY - containerRect.top - offsetY;

            x = Math.max(0, Math.min(x, container.clientWidth - item.offsetWidth));
            y = Math.max(0, Math.min(y, container.clientHeight - item.offsetHeight));

            item.style.left = `${x}px`;
            item.style.top = `${y}px`;
        };

        const onUp = (ev) => {
            item.releasePointerCapture(ev.pointerId);
            item.removeEventListener("pointermove", onMove);
            item.removeEventListener("pointerup", onUp);
            item.removeEventListener("pointercancel", onUp);

            if (isObjClass) {
                item.style.transform = "";
            }
        };

        item.addEventListener("pointermove", onMove);
        item.addEventListener("pointerup", onUp);
        item.addEventListener("pointercancel", onUp);
    });
});


let expandedItem = null;
let overlay = null;
const savedStyle = new Map();
const pressStart = new WeakMap();

const createOverlay = (zIndex) => {
    overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0, 0, 0, 0.15)";
    overlay.style.opacity = "0";
    overlay.style.transition = "opacity 0.2s ease";
    overlay.style.zIndex = String(zIndex);
    overlay.style.pointerEvents = "auto";
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.style.opacity = "1";
    });

    overlay.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeExpandedItem();
    });
};

const removeOverlay = () => {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
};

const expandItem = (item) => {
    if (expandedItem) return;

    const rect = item.getBoundingClientRect();
    const maxW = window.innerWidth * 0.8;
    const maxH = window.innerHeight * 0.8;
    const scale = Math.min(maxW / rect.width, maxH / rect.height);

    const newW = rect.width * scale;
    const newH = rect.height * scale;

    savedStyle.set(item, item.getAttribute("style"));

    const itemZ = topZ + 10000;

    item.style.position = "fixed";
    item.style.left = `${(window.innerWidth - newW) / 2}px`;
    item.style.top = `${(window.innerHeight - newH) / 2}px`;
    item.style.width = `${newW}px`;
    item.style.height = `${newH}px`;
    item.style.transform = "none";
    item.style.zIndex = String(itemZ);
    item.style.transition = "all 0.4s ease";

    expandedItem = item;

    setTimeout(() => {
        createOverlay(itemZ - 1);
        document.addEventListener("pointerdown", onOutsidePointerDown, true);
    }, 350);
};

const closeExpandedItem = () => {
    if (!expandedItem) return;

    const prev = savedStyle.get(expandedItem);
    if (prev == null) expandedItem.removeAttribute("style");
    else expandedItem.setAttribute("style", prev);

    savedStyle.delete(expandedItem);
    expandedItem = null;

    removeOverlay();
    document.removeEventListener("pointerdown", onOutsidePointerDown, true);
};

const onOutsidePointerDown = (e) => {
    if (!expandedItem) return;
    if (expandedItem.contains(e.target)) return;

    e.preventDefault();
    e.stopPropagation();
    closeExpandedItem();
};

items.forEach((item) => {
    item.addEventListener("pointerdown", (e) => {
        if (expandedItem) return;
        pressStart.set(item, { x: e.clientX, y: e.clientY });

        item.setPointerCapture(e.pointerId);
        item.style.zIndex = String(++topZ);
    });

    item.addEventListener("pointermove", (e) => {
        if (expandedItem) return;

        const start = pressStart.get(item);
        if (!start) return;

        const container = item.closest(".flexbox") || document.body;
        const containerRect = container.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();

        let x = e.clientX - containerRect.left - (e.clientX - itemRect.left);
        let y = e.clientY - containerRect.top - (e.clientY - itemRect.top);

        x = Math.max(0, Math.min(x, container.clientWidth - item.offsetWidth));
        y = Math.max(0, Math.min(y, container.clientHeight - item.offsetHeight));

        item.style.left = `${x}px`;
        item.style.top = `${y}px`;
    });

    item.addEventListener("pointerup", (e) => {
        if (expandedItem) return;

        const start = pressStart.get(item);
        if (!start) return;

        const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
        pressStart.delete(item);

        item.releasePointerCapture(e.pointerId);

        if (moved <= 4) {
            requestAnimationFrame(() => {
                if (!expandedItem) expandItem(item);
            });
        }
    });

    item.addEventListener("pointercancel", () => {
        pressStart.delete(item);
    });
});