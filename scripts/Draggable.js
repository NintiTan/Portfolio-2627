const frame = document.getElementById("frame-wrap");
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

            const xPercent = (x / frame.clientWidth) * 100;
            const yPercent = (y / frame.clientHeight) * 100;

            item.style.left = `${xPercent}%`;
            item.style.top = `${yPercent}%`;
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


const isObjElement = (el) =>
    el.classList.contains("obj") ||
    [...el.classList].some((cls) => /^obj\d+$/.test(cls));

const objItems = [...items].filter(isObjElement);

let expandedObj = null;
let expandedOverlay = null;
let activeTapeItems = [];

const savedObjStyle = new Map();
const savedTapeStyle = new Map();
const pressStart = new WeakMap();

const getObjIndex = (obj) => {
    const cls = [...obj.classList].find((c) => /^obj\d+$/.test(c));
    if (!cls) return null;
    return cls.replace("obj", "");
};

const getTapeForObj = (obj) => {
    // Only tapes inside this specific .object
    return [...obj.querySelectorAll(".tape")];
};

const disableTapeForObj = (obj) => {
    activeTapeItems = getTapeForObj(obj);
    activeTapeItems.forEach((t) => {
        savedTapeStyle.set(t, t.getAttribute("style"));
        t.style.visibility = "hidden";
        t.style.pointerEvents = "none";
    });
};

const restoreActiveTape = () => {
    activeTapeItems.forEach((t) => {
        const prev = savedTapeStyle.get(t);
        if (prev == null) t.removeAttribute("style");
        else t.setAttribute("style", prev);
        savedTapeStyle.delete(t);
    });
    activeTapeItems = [];
};

const createOverlay = (zIndex) => {
    expandedOverlay = document.createElement("div");
    expandedOverlay.style.position = "fixed";
    expandedOverlay.style.inset = "0";
    expandedOverlay.style.background = "rgba(0, 0, 0, 0.15)";
    expandedOverlay.style.opacity = "0";
    expandedOverlay.style.transition = "opacity 0.2s ease";
    expandedOverlay.style.zIndex = String(zIndex);
    expandedOverlay.style.pointerEvents = "auto";
    document.body.appendChild(expandedOverlay);

    requestAnimationFrame(() => {
        expandedOverlay.style.opacity = "1";
    });

    expandedOverlay.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeExpandedObj();
    });
};

const removeOverlay = () => {
    if (!expandedOverlay) return;
    expandedOverlay.remove();
    expandedOverlay = null;
};

const expandObj = (obj) => {
    if (expandedObj) return;

    const rect = obj.getBoundingClientRect();
    const maxW = window.innerWidth * 0.8;
    const maxH = window.innerHeight * 0.8;
    const scale = Math.min(maxW / rect.width, maxH / rect.height);

    const newW = rect.width * scale;
    const newH = rect.height * scale;

    savedObjStyle.set(obj, obj.getAttribute("style"));

    const objZ = topZ + 10000;

    obj.style.position = "fixed";
    obj.style.left = `${(window.innerWidth - newW) / 2}px`;
    obj.style.top = `${(window.innerHeight - newH) / 2}px`;
    obj.style.width = `${newW}px`;
    obj.style.height = `${newH}px`;
    obj.style.transform = "none";
    obj.style.zIndex = String(objZ);
    obj.style.transition = "all 0.4s ease";

    disableTapeForObj(obj);
    expandedObj = obj;

    setTimeout(() => {
        createOverlay(objZ - 1);
        document.addEventListener("pointerdown", onOutsidePointerDown, true);
    }, 350); // matches the transition time
};

const closeExpandedObj = () => {
    if (!expandedObj) return;

    const prev = savedObjStyle.get(expandedObj);
    if (prev == null) expandedObj.removeAttribute("style");
    else expandedObj.setAttribute("style", prev);

    savedObjStyle.delete(expandedObj);
    expandedObj = null;

    restoreActiveTape();
    removeOverlay();
    document.removeEventListener("pointerdown", onOutsidePointerDown, true);
};

const onOutsidePointerDown = (e) => {
    if (!expandedObj) return;
    if (expandedObj.contains(e.target)) return;

    e.preventDefault();
    e.stopPropagation();
    closeExpandedObj();
};

document.addEventListener(
    "pointerdown",
    (e) => {
        if (expandedObj && expandedObj.contains(e.target)) {
            e.preventDefault();
            e.stopPropagation();
        }
    },
    true
);

objItems.forEach((obj) => {
    obj.addEventListener("pointerdown", (e) => {
        if (expandedObj) return;
        pressStart.set(obj, { x: e.clientX, y: e.clientY });
    });

    obj.addEventListener("pointerup", (e) => {
        if (expandedObj) return;
        const start = pressStart.get(obj);
        if (!start) return;

        const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
        pressStart.delete(obj);

        if (moved <= 4) {
            requestAnimationFrame(() => {
                if (!expandedObj) expandObj(obj);
            });
        }
    });

    obj.addEventListener("pointercancel", () => {
        pressStart.delete(obj);
    });
});
