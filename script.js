document.addEventListener("DOMContentLoaded", () => {
    const dashboard = document.getElementById("dashboard");
    const addWidgetBtn = document.getElementById("add-widget");
    const widgetTypeSelect = document.getElementById("widget-type");
    const editModeToggle = document.getElementById("edit-mode-toggle");
    const dashboardContainer = document.querySelector(".dashboard-container");

    let editMode = false;
    const gridSize = 20;

    loadWidgets();

    addWidgetBtn.addEventListener("click", () => {
        const type = widgetTypeSelect.value;
        addWidget(type, Date.now());
    });

    editModeToggle.addEventListener("click", () => {
        editMode = !editMode;
        dashboardContainer.classList.toggle("hidden", !editMode); b
        dashboard.classList.toggle("edit-mode", editMode);
    });

    function addWidget(type, id = Date.now(), x = 100, y = 100, width = 300, height = 250) {
        const widget = document.createElement("div");
        widget.classList.add("widget");
        widget.dataset.id = id;
        widget.dataset.type = type;
        widget.style.left = `${x}px`;
        widget.style.top = `${y}px`;
        widget.style.width = `${width}px`;
        widget.style.height = `${height}px`;

        let content = `<button class="remove">🗑️</button>`;

        if (type.includes("chart")) {
            const chartId = `chart-${id}`;
            content += `<canvas id="${chartId}"></canvas>`;
        } else if (type === "table") {
            content += `<table border="1">
                <tr><th>רבעון</th><th>מכירות</th></tr>
                <tr><td>Q1</td><td>$10,000</td></tr>
                <tr><td>Q2</td><td>$15,500</td></tr>
                <tr><td>Q3</td><td>$20,000</td></tr>
                <tr><td>Q4</td><td>$25,000</td></tr>
            </table>`;
        }

        widget.innerHTML = content;
        const resizeHandle = document.createElement("div");
        resizeHandle.classList.add("resize-handle");
        widget.appendChild(resizeHandle);

        // כפתור מחיקה
        widget.querySelector(".remove").addEventListener("click", () => {
            widget.remove();
            saveWidgets();
        });

        // שינוי גודל אובייקטים
        resizeHandle.addEventListener("mousedown", (e) => {
            e.stopPropagation();
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = widget.clientWidth;
            const startHeight = widget.clientHeight;

            function onMouseMove(event) {
                const newWidth = Math.max(100, startWidth + (event.clientX - startX));
                const newHeight = Math.max(100, startHeight + (event.clientY - startY));

                widget.style.width = `${newWidth}px`;
                widget.style.height = `${newHeight}px`;
            }

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", () => {
                document.removeEventListener("mousemove", onMouseMove);
                saveWidgets();
            }, { once: true });
        });

        // גרירה אובייקטים- עדיין לא גמור
        widget.addEventListener("mousedown", (e) => {
            if (!editMode) return;

            let shiftX = e.clientX - widget.getBoundingClientRect().left;
            let shiftY = e.clientY - widget.getBoundingClientRect().top;

            function moveAt(pageX, pageY) {
                let snappedX = Math.round((pageX - shiftX) / gridSize) * gridSize;
                let snappedY = Math.round((pageY - shiftY) / gridSize) * gridSize;

                const maxX = dashboard.clientWidth - widget.clientWidth;
                const maxY = dashboard.clientHeight - widget.clientHeight;

                snappedX = Math.max(0, Math.min(snappedX, maxX));
                snappedY = Math.max(0, Math.min(snappedY, maxY));

                widget.style.left = `${snappedX}px`;
                widget.style.top = `${snappedY}px`;
            }

            function onMouseMove(event) {
                moveAt(event.pageX, event.pageY);
            }

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", () => {
                document.removeEventListener("mousemove", onMouseMove);
                saveWidgets();
            }, { once: true });
        });

        dashboard.appendChild(widget);
        saveWidgets();

        if (type.includes("chart")) {
            setTimeout(() => createChart(`chart-${id}`, type), 50);
        }
    }

    function createChart(canvasId, type) {
        const ctx = document.getElementById(canvasId).getContext("2d");
        new Chart(ctx, {
            type: type.replace("-chart", ""),
            data: {
                labels: ["ינואר", "פברואר", "מרץ", "אפריל"],
                datasets: [{
                    label: "מכירות",
                    data: [12000, 19000, 17000, 22000],
                    backgroundColor: ["#ff6384", "#36a2eb", "#ffce56", "#4bc0c0"]
                }]
            }
        });
    }

    function saveWidgets() {
        const widgets = Array.from(document.querySelectorAll(".widget")).map(w => ({
            id: w.dataset.id,
            type: w.dataset.type,
            x: parseInt(w.style.left),
            y: parseInt(w.style.top),
            width: w.clientWidth,
            height: w.clientHeight
        }));
        localStorage.setItem("widgets", JSON.stringify(widgets));
    }

    function loadWidgets() {
        const storedWidgets = JSON.parse(localStorage.getItem("widgets")) || [];
        storedWidgets.forEach(({ id, type, x, y, width, height }) => addWidget(type, id, x, y, width, height));
    }
});
