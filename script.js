document.addEventListener("DOMContentLoaded", () => {
    const dashboard = document.getElementById("dashboard");
    const addWidgetBtn = document.getElementById("add-widget");
    const widgetTypeSelect = document.getElementById("widget-type");
    const editModeToggle = document.getElementById("edit-mode-toggle");
    const dashboardContainer = document.querySelector(".dashboard-container");

    const csvFileInput = document.getElementById("csv-file-input");
    const csvDataFieldXSelect = document.getElementById("csv-data-field-x");
    const csvDataFieldYSelect = document.getElementById("csv-data-field-y");
    const loadCsvDataBtn = document.getElementById("load-csv-data");

    let editMode = false;
    const gridSize = 20;

    let parsedCsvData = [];
    let csvHeaders = [];
    let selectedCsvChartData = null; // ישמור את הנתונים שנבחרו מה-CSV עבור הגרף הבא

    loadWidgets();

    addWidgetBtn.addEventListener("click", () => {
        const type = widgetTypeSelect.value;
        // העבר את הנתונים הנבחרים מה-CSV אם קיימים
        addWidget(type, Date.now(), undefined, undefined, undefined, undefined, selectedCsvChartData);
        // לאחר הוספת ווידג'ט, אפס את הנתונים הנבחרים כדי שלא ישמשו לווידג'טים הבאים אלא אם כן נבחרו שוב
        selectedCsvChartData = null;
    });

    editModeToggle.addEventListener("click", () => {
        editMode = !editMode;
        dashboardContainer.classList.toggle("hidden", !editMode);
        dashboard.classList.toggle("edit-mode", editMode);

        // הסתר את ידיות השינוי כאשר לא במצב עריכה
        document.querySelectorAll(".widget").forEach(widget => {
            if (!editMode) {
                widget.classList.remove("selected");
            }
        });
    });

    csvFileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const csvText = e.target.result;
                parsedCsvData = parseCsv(csvText);
                if (parsedCsvData.length > 0) {
                    csvHeaders = Object.keys(parsedCsvData[0]);
                    populateFieldSelectors(csvHeaders);
                    csvDataFieldXSelect.style.display = 'inline-block';
                    csvDataFieldYSelect.style.display = 'inline-block';
                    loadCsvDataBtn.style.display = 'inline-block';
                    alert("קובץ CSV נטען בהצלחה. אנא בחר שדות X ו-Y.");
                } else {
                    alert("לא ניתן לנתח את קובץ ה-CSV. וודא שהוא בפורמט תקין.");
                    resetCsvSelection();
                }
            };
            reader.onerror = () => {
                alert("אירעה שגיאה בקריאת הקובץ.");
                resetCsvSelection();
            };
            reader.readAsText(file);
        } else {
            resetCsvSelection();
        }
    });

    loadCsvDataBtn.addEventListener("click", () => {
        const selectedXField = csvDataFieldXSelect.value;
        const selectedYField = csvDataFieldYSelect.value;

        if (selectedXField && selectedYField && parsedCsvData.length > 0) {
            selectedCsvChartData = {
                labels: parsedCsvData.map(row => row[selectedXField]),
                values: parsedCsvData.map(row => parseFloat(row[selectedYField])) // ודא המרה למספרים
            };
            alert(`נתונים נבחרו לגרף: X=${selectedXField}, Y=${selectedYField}. כעת הוסף ווידג'ט ובחר סוג גרף.`);
        } else {
            alert("אנא בחר שדות X ו-Y לפני טעינת הנתונים לגרף.");
            selectedCsvChartData = null;
        }
    });

    function addWidget(type, id = Date.now(), x = 100, y = 100, width = 300, height = 250, chartData = null) {
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
            // Plotly משתמש ב-div, לא ב-canvas
            content += `<div id="${chartId}" style="width:100%;height:100%;"></div>`;
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
        widget.querySelector(".remove").addEventListener("click", (e) => {
            e.stopPropagation(); // מונע את הפעלת אירוע ה-mousedown של הווידג'ט
            widget.remove();
            saveWidgets();
        });

        // שינוי גודל אובייקטים
        resizeHandle.addEventListener("mousedown", (e) => {
            if (!editMode) return;
            e.stopPropagation(); // מונע גרירה של הווידג'ט בזמן שינוי גודל
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

            function onMouseUp() {
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
                saveWidgets();
                // עדכן את הגרף לאחר שינוי גודל אם זה ווידג'ט גרף
                if (type.includes("chart")) {
                    const chartId = `chart-${id}`;
                    const existingChartDiv = document.getElementById(chartId);
                    if (existingChartDiv) {
                         // Plotly יודע להתאים את עצמו לגודל הדיב המכיל
                         // אבל אם הדיב השתנה דרמטית, אפשר לרנדר מחדש או לשנות פריסה:
                         // Plotly.relayout(existingChartDiv, {autosize: true});
                         // או לקרוא שוב ל-createChart עם הנתונים המקוריים אם תצטרך
                         const storedWidgets = JSON.parse(localStorage.getItem("widgets")) || [];
                         const storedWidget = storedWidgets.find(w => w.id == id);
                         if (storedWidget && storedWidget.chartData) {
                             createChart(chartId, type, storedWidget.chartData);
                         } else {
                             createChart(chartId, type); // השתמש בנתוני ברירת מחדל או נתונים קיימים
                         }
                    }
                }
            }

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        });

        // גרירה אובייקטים
        widget.addEventListener("mousedown", (e) => {
            if (!editMode) return;
            if (e.target.classList.contains("remove") || e.target.classList.contains("resize-handle")) {
                return; // אל תגרור אם לוחצים על כפתור המחיקה או ידית שינוי הגודל
            }

            // הסר בחירה מכל הווידג'טים האחרים ובחר את הנוכחי
            document.querySelectorAll(".widget").forEach(w => w.classList.remove("selected"));
            widget.classList.add("selected");


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

            function onMouseUp() {
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
                saveWidgets();
            }

            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        });

        dashboard.appendChild(widget);
        saveWidgets(); // שמור מיד לאחר הוספה

        if (type.includes("chart")) {
            // השהיה קצרה לוודא שה-div של הגרף נוצר וזמין ב-DOM
            setTimeout(() => createChart(`chart-${id}`, type, chartData), 50);
        }
    }

    function createChart(canvasId, type, chartData = null) {
        const chartDiv = document.getElementById(canvasId);
        if (!chartDiv) {
            console.error(`Chart div with ID ${canvasId} not found.`);
            return;
        }

        let labels;
        let values;
        let titleSuffix = '';

        if (chartData) {
            labels = chartData.labels;
            values = chartData.values;
            titleSuffix = ' (מתוך קובץ CSV)';
        } else {
            // נתוני ברירת מחדל אם אין נתוני CSV או שהם לא נבחרו
            labels = ["ינואר", "פברואר", "מרץ", "אפריל"];
            values = [12000, 19000, 17000, 22000];
        }

        let data = [];
        let layout = {};

        switch (type) {
            case "bar-chart":
                data = [{
                    x: labels,
                    y: values,
                    type: 'bar',
                    name: 'מכירות'
                }];
                layout = {
                    title: `מכירות חודשיות - גרף עמודות${titleSuffix}`,
                    xaxis: { title: chartData ? csvDataFieldXSelect.value : "חודש" },
                    yaxis: { title: chartData ? csvDataFieldYSelect.value : "מכירות" },
                    margin: { t: 40, b: 40, l: 40, r: 40 } // מרווחים פנימיים
                };
                break;
            case "line-chart":
                data = [{
                    x: labels,
                    y: values,
                    mode: 'lines+markers',
                    name: 'מכירות'
                }];
                layout = {
                    title: `מכירות חודשיות - גרף קו${titleSuffix}`,
                    xaxis: { title: chartData ? csvDataFieldXSelect.value : "חודש" },
                    yaxis: { title: chartData ? csvDataFieldYSelect.value : "מכירות" },
                    margin: { t: 40, b: 40, l: 40, r: 40 }
                };
                break;
            case "pie-chart":
                data = [{
                    values: values,
                    labels: labels,
                    type: 'pie',
                    name: 'מכירות',
                    hoverinfo: 'label+percent+name',
                    textinfo: 'percent',
                    textposition: 'inside'
                }];
                layout = {
                    title: `התפלגות מכירות - גרף עוגה${titleSuffix}`,
                    margin: { t: 40, b: 40, l: 40, r: 40 },
                    autosize: true
                };
                break;
            default:
                console.warn(`Unsupported chart type: ${type}`);
                return;
        }

        Plotly.newPlot(chartDiv, data, layout);
    }

    function parseCsv(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        if (lines.length === 0) return [];

        // הסר סימני BOM אם קיימים (במיוחד ב-UTF-8)
        const headersLine = lines[0].startsWith('\uFEFF') ? lines[0].substring(1) : lines[0];
        const headers = headersLine.split(',').map(h => h.trim());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length !== headers.length) {
                console.warn(`Skipping malformed row: ${lines[i]}`);
                continue; // דלג על שורות לא תקינות
            }
            let row = {};
            headers.forEach((header, index) => {
                row[header] = values[index];
            });
            data.push(row);
        }
        return data;
    }

    function populateFieldSelectors(headers) {
        csvDataFieldXSelect.innerHTML = '<option value="">בחר שדה X</option>';
        csvDataFieldYSelect.innerHTML = '<option value="">בחר שדה Y</option>';
        headers.forEach(header => {
            const optionX = document.createElement('option');
            optionX.value = header;
            optionX.textContent = header;
            csvDataFieldXSelect.appendChild(optionX);

            const optionY = document.createElement('option');
            optionY.value = header;
            optionY.textContent = header;
            csvDataFieldYSelect.appendChild(optionY);
        });
    }

    function resetCsvSelection() {
        parsedCsvData = [];
        csvHeaders = [];
        selectedCsvChartData = null;
        csvDataFieldXSelect.innerHTML = '<option value="">בחר שדה X</option>';
        csvDataFieldYSelect.innerHTML = '<option value="">בחר שדה Y</option>';
        csvDataFieldXSelect.style.display = 'none';
        csvDataFieldYSelect.style.display = 'none';
        loadCsvDataBtn.style.display = 'none';
        csvFileInput.value = ''; // נקה את קובץ הקלט
    }

    function saveWidgets() {
        const widgets = Array.from(document.querySelectorAll(".widget")).map(w => {
            let chartDataToSave = null;
            if (w.dataset.type.includes("chart")) {
                const chartId = `chart-${w.dataset.id}`;
                const chartDiv = document.getElementById(chartId);
                if (chartDiv && chartDiv.data && chartDiv.data.length > 0) {
                    // נסה לשמור את הנתונים המשמשים את הגרף
                    chartDataToSave = {
                        labels: chartDiv.data[0].x || chartDiv.data[0].labels,
                        values: chartDiv.data[0].y || chartDiv.data[0].values
                    };
                }
            }
            return {
                id: w.dataset.id,
                type: w.dataset.type,
                x: parseInt(w.style.left),
                y: parseInt(w.style.top),
                width: w.clientWidth,
                height: w.clientHeight,
                chartData: chartDataToSave // שמור את נתוני הגרף אם קיימים
            };
        });
        localStorage.setItem("widgets", JSON.stringify(widgets));
    }

    function loadWidgets() {
        const storedWidgets = JSON.parse(localStorage.getItem("widgets")) || [];
        storedWidgets.forEach(({ id, type, x, y, width, height, chartData }) => addWidget(type, id, x, y, width, height, chartData));
    }
});
