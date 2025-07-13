document.addEventListener("DOMContentLoaded", () => {
    const dashboard = document.getElementById("dashboard");
    const addWidgetBtn = document.getElementById("add-widget");
    const widgetTypeSelect = document.getElementById("widget-type");
    const editModeToggle = document.getElementById("edit-mode-toggle");
    const dashboardContainer = document.querySelector(".dashboard-container");

    const csvFileInput = document.getElementById("csv-file-input");
    const csvDataFieldXSelect = document.getElementById("csv-data-field-x");
    const csvDataFieldYSelect = document.getElementById("csv-data-field-y");
    const csvDataFieldZSelect = document.getElementById("csv-data-field-z"); // נוסף שדה Z
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
                    csvDataFieldZSelect.style.display = 'inline-block'; // הצג גם שדה Z
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
        const selectedZField = csvDataFieldZSelect.value; // קבל שדה Z

        // בדוק ששדות נבחרו בהתאם לסוג הגרף
        if (parsedCsvData.length > 0 && selectedXField) {
            selectedCsvChartData = {
                labels: parsedCsvData.map(row => row[selectedXField]),
                values: parsedCsvData.map(row => parseFloat(row[selectedYField] || 0)), // ודא המרה למספרים, ברירת מחדל ל-0
                zValues: parsedCsvData.map(row => parseFloat(row[selectedZField] || 0)), // ודא המרה למספרים, ברירת מחדל ל-0
                xField: selectedXField,
                yField: selectedYField,
                zField: selectedZField
            };
            alert(`נתונים נבחרו לגרף: X=${selectedXField}, Y=${selectedYField || 'לא נבחר'}, Z=${selectedZField || 'לא נבחר'}. כעת הוסף ווידג'ט ובחר סוג גרף.`);
        } else {
            alert("אנא בחר לפחות שדה X לפני טעינת הנתונים לגרף.");
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

        if (chartData) {
            widget.dataset.chartData = JSON.stringify(chartData); // שמור את הנתונים בווידג'ט
        }

        let content = `<button class="remove">❌</button>`;

        if (type.includes("chart") || type === "gauge-meter") { // גם Gauge Meter נחשב לגרף
            const chartId = `chart-${id}`;
            // Plotly משתמש ב-div, לא ב-canvas
            content += `<div id="${chartId}" style="width:100%;height:100%;"></div>`;
        } else if (type === "table") {
            const tableId = `table-${id}`;
            content += `<div id="${tableId}" style="width:100%;height:100%;overflow:auto;"></div>`; // הוסף overflow לטבלה
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
                if (type.includes("chart") || type === "gauge-meter") {
                    const chartId = `chart-${id}`;
                    const existingChartDiv = document.getElementById(chartId);
                    if (existingChartDiv) {
                         Plotly.relayout(existingChartDiv, {autosize: true});
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

        if (type.includes("chart") || type === "gauge-meter") {
            // השהיה קצרה לוודא שה-div של הגרף נוצר וזמין ב-DOM
            setTimeout(() => createChart(`chart-${id}`, type, chartData), 50);
        } else if (type === "table") {
            setTimeout(() => createTable(`table-${id}`, parsedCsvData, csvHeaders), 50);
        }
    }

    function createChart(canvasId, type, chartData = null) {
        const chartDiv = document.getElementById(canvasId);
        if (!chartDiv) {
            console.error(`Chart div with ID ${canvasId} not found.`);
            return;
        }

        // ודא שיש נתונים, אחרת הצג הודעה
        if (!chartData || chartData.labels.length === 0) {
            chartDiv.innerHTML = '<p style="text-align: center; color: gray;">בחר קובץ CSV ושדות נתונים ליצירת הגרף.</p>';
            return;
        }

        const labels = chartData.labels;
        const values = chartData.values;
        const zValues = chartData.zValues; // השתמש ב-zValues
        const xAxisTitle = chartData.xField || "שדה X";
        const yAxisTitle = chartData.yField || "שדה Y";
        const zAxisTitle = chartData.zField || "שדה Z";

        let data = [];
        let layout = {
            margin: { t: 40, b: 40, l: 40, r: 40 },
            autosize: true,
            hovermode: 'closest' // שיפור אינטראקטיביות
        };

        const defaultNoDataMessage = '<p style="text-align: center; color: gray;">נתונים חסרים או לא מתאימים לסוג גרף זה.</p>';

        switch (type) {
            case "bar-chart":
                data = [{ x: labels, y: values, type: 'bar', name: 'נתונים' }];
                layout.title = `גרף עמודות עבור ${xAxisTitle} ו-${yAxisTitle}`;
                layout.xaxis = { title: xAxisTitle };
                layout.yaxis = { title: yAxisTitle };
                break;
            case "bar-chart-h": // גרף עמודות אופקי
                data = [{ y: labels, x: values, type: 'bar', orientation: 'h', name: 'נתונים' }];
                layout.title = `גרף עמודות אופקי עבור ${xAxisTitle} ו-${yAxisTitle}`;
                layout.xaxis = { title: yAxisTitle };
                layout.yaxis = { title: xAxisTitle };
                break;
            case "line-chart":
                data = [{ x: labels, y: values, mode: 'lines', name: 'נתונים' }];
                layout.title = `גרף קו עבור ${xAxisTitle} ו-${yAxisTitle}`;
                layout.xaxis = { title: xAxisTitle };
                layout.yaxis = { title: yAxisTitle };
                break;
            case "line-chart-scatter": // גרף קו עם נקודות
                data = [{ x: labels, y: values, mode: 'lines+markers', name: 'נתונים' }];
                layout.title = `גרף קו עם נקודות עבור ${xAxisTitle} ו-${yAxisTitle}`;
                layout.xaxis = { title: xAxisTitle };
                layout.yaxis = { title: yAxisTitle };
                break;
            case "pie-chart":
                data = [{ values: values, labels: labels, type: 'pie', name: 'התפלגות', hoverinfo: 'label+percent+name', textinfo: 'percent', textposition: 'inside' }];
                layout.title = `גרף עוגה עבור התפלגות ${xAxisTitle} לפי ${yAxisTitle}`;
                break;
            case "scatter-chart":
                data = [{ x: labels, y: values, mode: 'markers', type: 'scatter', name: 'נקודות' }];
                layout.title = `גרף פיזור של ${yAxisTitle} מול ${xAxisTitle}`;
                layout.xaxis = { title: xAxisTitle };
                layout.yaxis = { title: yAxisTitle };
                break;
            case "scatter-chart-lines": // גרף פיזור (קוים בלבד)
                data = [{ x: labels, y: values, mode: 'lines', type: 'scatter', name: 'קוים' }];
                layout.title = `גרף פיזור (קוים בלבד) של ${yAxisTitle} מול ${xAxisTitle}`;
                layout.xaxis = { title: xAxisTitle };
                layout.yaxis = { title: yAxisTitle };
                break;
            case "scatter-chart-text": // גרף פיזור (טקסט)
                data = [{ x: labels, y: values, mode: 'text', type: 'scatter', text: labels, textposition: 'top center', name: 'טקסט' }];
                layout.title = `גרף פיזור (טקסט) של ${yAxisTitle} מול ${xAxisTitle}`;
                layout.xaxis = { title: xAxisTitle };
                layout.yaxis = { title: yAxisTitle };
                break;
            case "area-chart": // גרף שטח
                data = [{ x: labels, y: values, fill: 'tozeroy', type: 'scatter', mode: 'lines', name: 'שטח' }];
                layout.title = `גרף שטח עבור ${xAxisTitle} ו-${yAxisTitle}`;
                layout.xaxis = { title: xAxisTitle };
                layout.yaxis = { title: yAxisTitle };
                break;
            case "box-chart":
                data = [{ y: values, type: 'box', name: yAxisTitle }];
                layout.title = `תרשים קופסה של ${yAxisTitle}`;
                layout.yaxis = { title: yAxisTitle };
                break;
            case "histogram":
                data = [{ x: labels.map(val => parseFloat(val)), type: 'histogram', name: xAxisTitle, marker: { color: 'rgba(50, 171, 96, 0.6)' } }];
                layout.title = `היסטוגרמה של ${xAxisTitle}`;
                layout.xaxis = { title: xAxisTitle, automargin: true };
                layout.yaxis = { title: 'תדירות', automargin: true };
                layout.bargap = 0.05;
                break;
            case "funnel-chart": // גרף משפך
                 data = [{
                    y: labels,
                    x: values,
                    type: 'funnel',
                    orientation: 'h' // אופקי נפוץ יותר למשפך
                }];
                layout.title = `גרף משפך עבור ${yAxisTitle} לפי ${xAxisTitle}`;
                layout.xaxis = { title: xAxisTitle };
                layout.yaxis = { title: yAxisTitle };
                break;
            case "violin-chart": // גרף כינור (דומה לבוקסה אבל מציג צפיפות)
                 if (values.length === 0) {
                     chartDiv.innerHTML = defaultNoDataMessage;
                    return;
                 }
                data = [{
                    y: values,
                    type: 'violin',
                    box: { visible: true },
                    points: 'all',
                    name: yAxisTitle
                }];
                layout.title = `גרף כינור של ${yAxisTitle}`;
                layout.yaxis = { title: yAxisTitle };
                break;
            case "polar-chart": // גרף קוטבי
                if (labels.length === 0 || values.length === 0) {
                     chartDiv.innerHTML = defaultNoDataMessage;
                    return;
                }
                data = [{
                    r: values,
                    theta: labels,
                    mode: 'lines+markers',
                    type: 'scatterpolar'
                }];
                layout.title = `גרף קוטבי: ${yAxisTitle} מול ${xAxisTitle}`;
                layout.polar = {
                    radialaxis: {
                        visible: true,
                        range: [0, Math.max(...values) * 1.1 || 100]
                    }
                };
                break;
            case "sunburst-chart": // גרף Sunburst (היררכי)
                chartDiv.innerHTML = '<p style="text-align: center; color: gray;">גרף Sunburst דורש נתונים היררכיים (הורה, ילד, ערך). אנא ספק נתונים מתאימים.</p>';
                return;
            case "treemap-chart": // גרף Treemap (היררכי)
                chartDiv.innerHTML = '<p style="text-align: center; color: gray;">גרף Treemap דורש נתונים היררכיים (הורה, ילד, ערך). אנא ספק נתונים מתאימים.</p>';
                return;
            case "icicle-chart": // גרף Icicle (היררכי)
                chartDiv.innerHTML = '<p style="text-align: center; color: gray;">גרף Icicle דורש נתונים היררכיים (הורה, ילד, ערך). אנא ספק נתונים מתאימים.</p>';
                return;

            // גרפים דו-מימדיים מתקדמים
            case "bubble-chart": // גרף בועות (דורש X, Y, ו-Z לגודל)
                if (zValues.some(isNaN) || zValues.length === 0) { // לוודא ששדה Z נבחר כראוי
                    chartDiv.innerHTML = '<p style="text-align: center; color: gray;">עבור גרף בועות, אנא בחר שדה Z (לגודל הבועה) המכיל ערכים מספריים.</p>';
                    return;
                }
                data = [{
                    x: labels,
                    y: values,
                    mode: 'markers',
                    marker: {
                        size: zValues.map(val => val / 10 + 5), // קנה מידה לגודל הבועה, מינימום 5
                        sizemode: 'area',
                        sizeref: 2 * Math.max(...zValues) / (40**2) || 1, // גודל יחסי
                        sizemin: 4
                    },
                    type: 'scatter',
                    name: 'נתונים'
                }];
                layout.title = `גרף בועות: ${yAxisTitle} מול ${xAxisTitle} (גודל: ${zAxisTitle})`;
                layout.xaxis = { title: xAxisTitle };
                layout.yaxis = { title: yAxisTitle };
                break;
            case "density-heatmap": // מפת חום צפיפות
                if (labels.length === 0 || values.length === 0) {
                     chartDiv.innerHTML = defaultNoDataMessage;
                    return;
                }
                data = [{
                    x: labels,
                    y: values,
                    type: 'histogram2dcontour', // או histogram2d
                    colorscale: 'Viridis'
                }];
                layout.title = `מפת חום צפיפות של ${yAxisTitle} מול ${xAxisTitle}`;
                layout.xaxis = { title: xAxisTitle };
                layout.yaxis = { title: yAxisTitle };
                break;
            case "heatmap":
                if (zValues.some(isNaN) || zValues.length === 0) {
                     chartDiv.innerHTML = '<p style="text-align: center; color: gray;">עבור מפת חום, אנא בחר שדה Z מספרי כערכים עבור צבע המפה.</p>';
                    return;
                }
                const uniqueLabelsHeatmap = [...new Set(labels)];
                const uniqueValuesHeatmap = [...new Set(values)];
                const zMatrixHeatmap = [];

                if (uniqueLabelsHeatmap.length >= 2 && uniqueValuesHeatmap.length >= 2) {
                    for (let i = 0; i < uniqueValuesHeatmap.length; i++) {
                        zMatrixHeatmap.push(Array(uniqueLabelsHeatmap.length).fill(0));
                    }
                    parsedCsvData.forEach(row => {
                        const xIdx = uniqueLabelsHeatmap.indexOf(row[chartData.xField]);
                        const yVal = parseFloat(row[chartData.yField]);
                        const yIdx = uniqueValuesHeatmap.indexOf(yVal);
                        const zVal = parseFloat(row[chartData.zField]);
                        if (xIdx !== -1 && yIdx !== -1 && !isNaN(zVal)) {
                            zMatrixHeatmap[yIdx][xIdx] = zVal;
                        }
                    });
                } else if (labels.length > 0 && values.length > 0 && zValues.length > 0) {
                    // ניסיון ליצור מטריצה מופשטת אם אין קטגוריות מספיקות
                    const rows = Math.floor(Math.sqrt(zValues.length));
                    const cols = Math.ceil(zValues.length / rows);
                    for (let i = 0; i < rows; i++) {
                        zMatrixHeatmap.push(zValues.slice(i * cols, (i + 1) * cols));
                    }
                    layout.xaxis = { title: 'אינדקס X' };
                    layout.yaxis = { title: 'אינדקס Y' };
                } else {
                    chartDiv.innerHTML = defaultNoDataMessage;
                    return;
                }

                data = [{
                    z: zMatrixHeatmap,
                    x: uniqueLabelsHeatmap.length >= 2 ? uniqueLabelsHeatmap : Array.from({length: zMatrixHeatmap[0] ? zMatrixHeatmap[0].length : 0}, (_, i) => i),
                    y: uniqueValuesHeatmap.length >= 2 ? uniqueValuesHeatmap : Array.from({length: zMatrixHeatmap.length}, (_, i) => i),
                    type: 'heatmap'
                }];
                layout.title = `מפת חום: ${zAxisTitle} לפי ${xAxisTitle} ו-${yAxisTitle}`;
                layout.xaxis = { title: xAxisTitle };
                layout.yaxis = { title: yAxisTitle };
                break;
            case "contour":
                 if (zValues.some(isNaN) || zValues.length === 0) {
                     chartDiv.innerHTML = '<p style="text-align: center; color: gray;">עבור קונטור, אנא בחר שדה Z מספרי כערכים לגבהים.</p>';
                    return;
                }
                 const uniqueLabelsContour = [...new Set(labels)];
                const uniqueValuesContour = [...new Set(values)];
                const zMatrixContour = [];

                if (uniqueLabelsContour.length >= 2 && uniqueValuesContour.length >= 2) {
                    for (let i = 0; i < uniqueValuesContour.length; i++) {
                        zMatrixContour.push(Array(uniqueLabelsContour.length).fill(0));
                    }
                    parsedCsvData.forEach(row => {
                        const xIdx = uniqueLabelsContour.indexOf(row[chartData.xField]);
                        const yVal = parseFloat(row[chartData.yField]);
                        const yIdx = uniqueValuesContour.indexOf(yVal);
                        const zVal = parseFloat(row[chartData.zField]);
                        if (xIdx !== -1 && yIdx !== -1 && !isNaN(zVal)) {
                            zMatrixContour[yIdx][xIdx] = zVal;
                        }
                    });
                } else if (labels.length > 0 && values.length > 0 && zValues.length > 0) {
                     const rows = Math.floor(Math.sqrt(zValues.length));
                    const cols = Math.ceil(zValues.length / rows);
                    for (let i = 0; i < rows; i++) {
                        zMatrixContour.push(zValues.slice(i * cols, (i + 1) * cols));
                    }
                    layout.xaxis = { title: 'אינדקס X' };
                    layout.yaxis = { title: 'אינדקס Y' };
                } else {
                    chartDiv.innerHTML = defaultNoDataMessage;
                    return;
                }

                data = [{
                    z: zMatrixContour,
                    x: uniqueLabelsContour.length >= 2 ? uniqueLabelsContour : Array.from({length: zMatrixContour[0] ? zMatrixContour[0].length : 0}, (_, i) => i),
                    y: uniqueValuesContour.length >= 2 ? uniqueValuesContour : Array.from({length: zMatrixContour.length}, (_, i) => i),
                    type: 'contour'
                }];
                layout.title = `קונטור: ${zAxisTitle} לפי ${xAxisTitle} ו-${yAxisTitle}`;
                layout.xaxis = { title: xAxisTitle };
                layout.yaxis = { title: yAxisTitle };
                break;
            case "histogram2d":
                if (labels.length === 0 || values.length === 0) {
                     chartDiv.innerHTML = defaultNoDataMessage;
                    return;
                }
                data = [{
                    x: labels.map(Number),
                    y: values.map(Number),
                    type: 'histogram2d',
                    colorscale: 'Portland'
                }];
                layout.title = `היסטוגרמה דו-מימדית של ${yAxisTitle} מול ${xAxisTitle}`;
                layout.xaxis = { title: xAxisTitle };
                layout.yaxis = { title: yAxisTitle };
                break;
            case "histogram2d-contour":
                 if (labels.length === 0 || values.length === 0) {
                     chartDiv.innerHTML = defaultNoDataMessage;
                    return;
                }
                data = [{
                    x: labels.map(Number),
                    y: values.map(Number),
                    type: 'histogram2dcontour',
                    colorscale: 'Viridis'
                }];
                layout.title = `קונטור היסטוגרמה דו-מימדית של ${yAxisTitle} מול ${xAxisTitle}`;
                layout.xaxis = { title: xAxisTitle };
                layout.yaxis = { title: yAxisTitle };
                break;
            case "density-mapbox": // מפת חום צפיפות Mapbox
                chartDiv.innerHTML = '<p style="text-align: center; color: gray;">מפת חום צפיפות Mapbox דורשת Mapbox API Key ושדות Lat/Lon.</p>';
                return;
            case "splom-chart": // מטריצת פיזור (SPLOM)
                if (parsedCsvData.length === 0 || csvHeaders.length < 2) {
                     chartDiv.innerHTML = defaultNoDataMessage;
                    return;
                }
                const numericHeadersSplom = csvHeaders.filter(header => parsedCsvData.every(row => !isNaN(parseFloat(row[header]))));
                if (numericHeadersSplom.length < 2) {
                     chartDiv.innerHTML = '<p style="text-align: center; color: gray;">מטריצת פיזור דורשת לפחות שני שדות מספריים ב-CSV.</p>';
                    return;
                }
                const dimensionsSplom = numericHeadersSplom.map(header => ({
                    label: header,
                    values: parsedCsvData.map(row => parseFloat(row[header]))
                }));
                data = [{
                    type: 'splom',
                    dimensions: dimensionsSplom,
                    showupperhalf: false, // מציג רק את חצי הגרפים התחתון
                    marker: {
                        color: 'blue',
                        size: 5,
                        line: {
                            width: 0.5,
                            color: 'white'
                        }
                    }
                }];
                layout.title = `מטריצת פיזור (SPLOM) של נתונים מספריים`;
                break;
            case "parcoords-chart": // קואורדינטות מקבילות
                if (parsedCsvData.length === 0 || csvHeaders.length < 2) {
                     chartDiv.innerHTML = defaultNoDataMessage;
                    return;
                }
                const numericHeadersParcoords = csvHeaders.filter(header => parsedCsvData.every(row => !isNaN(parseFloat(row[header]))));
                if (numericHeadersParcoords.length < 2) {
                     chartDiv.innerHTML = '<p style="text-align: center; color: gray;">קואורדינטות מקבילות דורשות לפחות שני שדות מספריים ב-CSV.</p>';
                    return;
                }
                const dimensionsParcoords = numericHeadersParcoords.map(header => ({
                    range: [Math.min(...parsedCsvData.map(row => parseFloat(row[header] || 0))), Math.max(...parsedCsvData.map(row => parseFloat(row[header] || 0)))],
                    label: header,
                    values: parsedCsvData.map(row => parseFloat(row[header] || 0))
                }));
                data = [{
                    type: 'parcoords',
                    line: { showscale: true, reversescale: true, colorscale: 'Jet' },
                    dimensions: dimensionsParcoords
                }];
                layout.title = `קואורדינטות מקבילות (כל השדות המספריים ב-CSV)`;
                break;
            case "parallel-categories-chart": // קטגוריות מקבילות
                if (parsedCsvData.length === 0 || csvHeaders.length < 2) {
                     chartDiv.innerHTML = defaultNoDataMessage;
                    return;
                }
                const categoryDimensions = csvHeaders.map(header => ({
                    label: header,
                    values: parsedCsvData.map(row => row[header])
                }));
                 data = [{
                    type: 'parcats',
                    dimensions: categoryDimensions,
                    line: {
                        color: parsedCsvData.map(row => parseFloat(row[csvHeaders[0]] || 0)), // השתמש בעמודה הראשונה לצבע
                        colorscale: 'Viridis',
                        showscale: true
                    },
                    hoveron: 'color',
                    hoverinfo: 'count'
                }];
                layout.title = `קטגוריות מקבילות (לכל השדות ב-CSV)`;
                break;
            case "sankey-chart": // דיאגרמת סאנקי (דורש קשרים בין צמתים)
                chartDiv.innerHTML = '<p style="text-align: center; color: gray;">דיאגרמת סאנקי דורשת נתונים בפורמט ספציפי (מקור, יעד, ערך). אנא ספק נתונים מתאימים.</p>';
                return;
            case "gantt-chart": // תרשים גאנט (דורש Start, End, Task)
                chartDiv.innerHTML = '<p style="text-align: center; color: gray;">תרשים גאנט דורש נתונים בפורמט ספציפי (תאריך התחלה, תאריך סיום, משימה). אנא ספק נתונים מתאימים.</p>';
                return;

            // גרפים תלת מימדיים
            case "scatter3d-chart": // גרף פיזור תלת מימדי
                 if (labels.length === 0 || values.length === 0 || zValues.length === 0 || zValues.some(isNaN)) {
                     chartDiv.innerHTML = '<p style="text-align: center; color: gray;">עבור גרף פיזור תלת מימדי, אנא בחר שלושה שדות מספריים (X, Y, Z).</p>';
                    return;
                }
                data = [{
                    x: labels.map(Number),
                    y: values,
                    z: zValues,
                    mode: 'markers',
                    marker: { size: 5 },
                    type: 'scatter3d'
                }];
                layout.title = `פיזור תלת מימדי של ${xAxisTitle}, ${yAxisTitle}, ${zAxisTitle}`;
                layout.scene = {
                    xaxis: { title: xAxisTitle },
                    yaxis: { title: yAxisTitle },
                    zaxis: { title: zAxisTitle }
                };
                break;
            case "line3d-chart": // גרף קו תלת מימדי
                 if (labels.length === 0 || values.length === 0 || zValues.length === 0 || zValues.some(isNaN)) {
                     chartDiv.innerHTML = '<p style="text-align: center; color: gray;">עבור גרף קו תלת מימדי, אנא בחר שלושה שדות מספריים (X, Y, Z).</p>';
                    return;
                }
                data = [{
                    x: labels.map(Number),
                    y: values,
                    z: zValues,
                    mode: 'lines',
                    type: 'scatter3d'
                }];
                layout.title = `קו תלת מימדי של ${xAxisTitle}, ${yAxisTitle}, ${zAxisTitle}`;
                layout.scene = {
                    xaxis: { title: xAxisTitle },
                    yaxis: { title: yAxisTitle },
                    zaxis: { title: zAxisTitle }
                };
                break;
            case "surface-chart": // גרף משטח תלת מימדי
                if (zValues.some(isNaN) || zValues.length === 0) {
                     chartDiv.innerHTML = '<p style="text-align: center; color: gray;">עבור גרף משטח, אנא בחר שדה Z מספרי.</p>';
                    return;
                }
                const uniqueXSurface = [...new Set(labels)];
                const uniqueYSurface = [...new Set(values)];
                const zSurfaceMatrix = [];

                if (uniqueXSurface.length >= 2 && uniqueYSurface.length >= 2) {
                    for (let i = 0; i < uniqueYSurface.length; i++) {
                        zSurfaceMatrix.push(Array(uniqueXSurface.length).fill(0));
                    }
                     parsedCsvData.forEach(row => {
                        const xIdx = uniqueXSurface.indexOf(row[chartData.xField]);
                        const yVal = parseFloat(row[chartData.yField]);
                        const yIdx = uniqueYSurface.indexOf(yVal);
                        const zVal = parseFloat(row[chartData.zField]);
                        if (xIdx !== -1 && yIdx !== -1 && !isNaN(zVal)) {
                            zSurfaceMatrix[yIdx][xIdx] = zVal;
                        }
                    });
                } else { // אם אין מספיק נתונים ליצור מטריצה, נשתמש בנתונים כרשימה וננסה
                     zSurfaceMatrix.push(zValues); // Plotly יכול לנסות לנחש מטריצה מזה
                }

                data = [{
                    z: zSurfaceMatrix,
                    type: 'surface'
                }];
                layout.title = `משטח תלת מימדי של ${zAxisTitle}`;
                layout.scene = {
                    xaxis: { title: xAxisTitle },
                    yaxis: { title: yAxisTitle },
                    zaxis: { title: zAxisTitle }
                };
                break;
            case "mesh3d-chart": // גרף רשת תלת מימדית
                if (labels.length === 0 || values.length === 0 || zValues.length === 0 || zValues.some(isNaN)) {
                     chartDiv.innerHTML = '<p style="text-align: center; color: gray;">עבור גרף רשת תלת מימדי, אנא בחר שלושה שדות מספריים (X, Y, Z).</p>';
                    return;
                }
                data = [{
                    x: labels.map(Number), // ודא שמספרים
                    y: values,
                    z: zValues,
                    type: 'mesh3d'
                }];
                layout.title = `רשת תלת מימדית של ${xAxisTitle}, ${yAxisTitle}, ${zAxisTitle}`;
                layout.scene = {
                    xaxis: { title: xAxisTitle },
                    yaxis: { title: yAxisTitle },
                    zaxis: { title: zAxisTitle }
                };
                break;
            case "cone-chart":
                 if (labels.length === 0 || values.length === 0 || zValues.length === 0 || zValues.some(isNaN)) {
                     chartDiv.innerHTML = '<p style="text-align: center; color: gray;">עבור גרף קונוס, אנא בחר שלושה שדות מספריים (X, Y, Z) וכן שדות U, V, W.</p>';
                    return;
                }
                // עבור Cone Chart, נצטרך גם U, V, W (רכיבי וקטור), שנניח שאינם זמינים בבחירת X, Y, Z הרגילה.
                // נציג רק את הנקודות כברירת מחדל או הודעה.
                chartDiv.innerHTML = '<p style="text-align: center; color: gray;">גרף קונוס דורש בנוסף ל-X,Y,Z גם רכיבי וקטור (U,V,W) ב-CSV.</p>';
                return;
            case "streamtube-chart":
                chartDiv.innerHTML = '<p style="text-align: center; color: gray;">גרף צינור זרימה דורש נתוני זרימה מורכבים (X,Y,Z,U,V,W) ב-CSV.</p>';
                return;
            case "isosurface-chart":
                if (labels.length === 0 || values.length === 0 || zValues.length === 0 || zValues.some(isNaN)) {
                     chartDiv.innerHTML = '<p style="text-align: center; color: gray;">עבור משטח איזו, אנא בחר שלושה שדות מספריים (X, Y, Z).</p>';
                    return;
                }
                data = [{
                    x: labels.map(Number),
                    y: values,
                    z: zValues,
                    value: zValues, // נניח ש-Z הוא גם ערך האיזו
                    type: 'isosurface',
                    opacity: 0.5,
                    isomin: Math.min(...zValues),
                    isomax: Math.max(...zValues)
                }];
                layout.title = `משטח איזו של ${zAxisTitle}`;
                layout.scene = {
                    xaxis: { title: xAxisTitle },
                    yaxis: { title: yAxisTitle },
                    zaxis: { title: zAxisTitle }
                };
                break;
            case "volume-chart":
                if (labels.length === 0 || values.length === 0 || zValues.length === 0 || zValues.some(isNaN)) {
                     chartDiv.innerHTML = '<p style="text-align: center; color: gray;">עבור גרף נפח, אנא בחר שלושה שדות מספריים (X, Y, Z).</p>';
                    return;
                }
                 data = [{
                    x: labels.map(Number),
                    y: values,
                    z: zValues,
                    value: zValues, // נניח ש-Z הוא גם ערך הנפח
                    type: 'volume',
                    opacity: 0.5,
                    isomin: Math.min(...zValues),
                    isomax: Math.max(...zValues)
                }];
                layout.title = `גרף נפח של ${zAxisTitle}`;
                layout.scene = {
                    xaxis: { title: xAxisTitle },
                    yaxis: { title: yAxisTitle },
                    zaxis: { title: zAxisTitle }
                };
                break;

            // גרפים פיננסיים
            case "candlestick-chart": // גרף נרות (מניות)
                // דורש O, H, L, C ו-Date. נניח ש-X הוא תאריך, Y הוא Open.
                if (parsedCsvData.length < 1 || !csvHeaders.includes("Date") || !csvHeaders.includes("Open") || !csvHeaders.includes("High") || !csvHeaders.includes("Low") || !csvHeaders.includes("Close")) {
                    chartDiv.innerHTML = '<p style="text-align: center; color: gray;">עבור גרף נרות, אנא טען קובץ CSV עם עמודות "Date", "Open", "High", "Low", "Close".</p>';
                    return;
                }
                data = [{
                    x: parsedCsvData.map(row => row["Date"]),
                    open: parsedCsvData.map(row => parseFloat(row["Open"])),
                    high: parsedCsvData.map(row => parseFloat(row["High"])),
                    low: parsedCsvData.map(row => parseFloat(row["Low"])),
                    close: parsedCsvData.map(row => parseFloat(row["Close"])),
                    type: 'candlestick',
                    xaxis: 'x',
                    yaxis: 'y'
                }];
                layout.title = `גרף נרות של נתוני מניות`;
                layout.xaxis = {
                    rangeslider: { visible: false },
                    title: 'תאריך'
                };
                layout.yaxis = { title: 'מחיר' };
                break;
            case "ohlc-chart": // גרף OHLC (מניות)
                if (parsedCsvData.length < 1 || !csvHeaders.includes("Date") || !csvHeaders.includes("Open") || !csvHeaders.includes("High") || !csvHeaders.includes("Low") || !csvHeaders.includes("Close")) {
                    chartDiv.innerHTML = '<p style="text-align: center; color: gray;">עבור גרף OHLC, אנא טען קובץ CSV עם עמודות "Date", "Open", "High", "Low", "Close".</p>';
                    return;
                }
                data = [{
                    x: parsedCsvData.map(row => row["Date"]),
                    open: parsedCsvData.map(row => parseFloat(row["Open"])),
                    high: parsedCsvData.map(row => parseFloat(row["High"])),
                    low: parsedCsvData.map(row => parseFloat(row["Low"])),
                    close: parsedCsvData.map(row => parseFloat(row["Close"])),
                    type: 'ohlc',
                    xaxis: 'x',
                    yaxis: 'y'
                }];
                layout.title = `גרף OHLC של נתוני מניות`;
                 layout.xaxis = {
                    rangeslider: { visible: false },
                    title: 'תאריך'
                };
                layout.yaxis = { title: 'מחיר' };
                break;
            case "waterfall-chart": // גרף מפל
                // דורש נתונים עם סכומים מצטברים
                chartDiv.innerHTML = '<p style="text-align: center; color: gray;">גרף מפל דורש נתונים עם סכומים מצטברים (לדוגמה, "שינוי חיובי", "שינוי שלילי", "סה"כ").</p>';
                return;
            case "funnel-area-chart": // גרף שטח משפך
                // דומה למשפך רגיל אבל עם מילוי שטח
                 data = [{
                    y: labels,
                    x: values,
                    type: 'funnelarea'
                }];
                layout.title = `גרף שטח משפך עבור ${yAxisTitle} לפי ${xAxisTitle}`;
                layout.xaxis = { title: xAxisTitle };
                layout.yaxis = { title: yAxisTitle };
                break;

            // מפות (דורש Mapbox API Key או GeoJSON)
            case "scatter-mapbox-chart": // מפת פיזור Mapbox
                if (!csvHeaders.includes("lat") || !csvHeaders.includes("lon") || values.length === 0) {
                     chartDiv.innerHTML = '<p style="text-align: center; color: gray;">עבור מפת Mapbox, אנא בחר קובץ CSV עם עמודות "lat", "lon" (וקיים שדה Y). ייתכן ויהיה צורך במפתח Mapbox API.</p>';
                    return;
                }
                data = [{
                    type: 'scattermapbox',
                    lat: parsedCsvData.map(row => parseFloat(row["lat"])),
                    lon: parsedCsvData.map(row => parseFloat(row["lon"])),
                    mode: 'markers',
                    marker: { size: 10, color: 'red' },
                    text: parsedCsvData.map(row => `${row[chartData.xField]}: ${row[chartData.yField]}`),
                }];
                layout.mapbox = { style: 'open-street-map', center: { lat: 31.771959, lon: 35.217018 }, zoom: 7 }; // מרכז ברירת מחדל לישראל
                layout.title = `מפת פיזור (Mapbox) של ${xAxisTitle} ו-${yAxisTitle}`;
                break;
            case "choropleth-mapbox-chart": // מפת חלוקה אזורית Mapbox
                chartDiv.innerHTML = '<p style="text-align: center; color: gray;">מפת חלוקה אזורית Mapbox דורשת Mapbox API Key ונתוני GeoJSON או מזהי מחוזות/מדינות.</p>';
                return;
            case "scatter-geo-chart": // מפת פיזור גיאוגרפית
                if (!csvHeaders.includes("lat") || !csvHeaders.includes("lon") || values.length === 0) {
                     chartDiv.innerHTML = '<p style="text-align: center; color: gray;">עבור מפת פיזור גיאוגרפית, אנא בחר קובץ CSV עם עמודות "lat", "lon" (וקיים שדה Y).</p>';
                    return;
                }
                data = [{
                    type: 'scattergeo',
                    lat: parsedCsvData.map(row => parseFloat(row["lat"])),
                    lon: parsedCsvData.map(row => parseFloat(row["lon"])),
                    mode: 'markers',
                    marker: { size: 10, color: values, colorscale: 'Viridis' },
                    text: parsedCsvData.map(row => `${row[chartData.xField]}: ${row[chartData.yField]}`),
                }];
                layout.geo = {
                    scope: 'world',
                    showland: true,
                    landcolor: 'rgb(243, 243, 243)',
                    countrycolor: 'rgb(204, 204, 204)'
                };
                layout.title = `מפת פיזור גיאוגרפית של ${xAxisTitle} ו-${yAxisTitle}`;
                break;
            case "choropleth-geo-chart": // מפת חלוקה אזורית גיאוגרפית
                chartDiv.innerHTML = '<p style="text-align: center; color: gray;">מפת חלוקה אזורית גיאוגרפית דורשת קודי מדינות/מחוזות וערכים.</p>';
                return;

            // אחרים
            case "gauge-meter": // מד - דורש שדה מספרי יחיד
                if (values.length === 0 || isNaN(values[0])) {
                     chartDiv.innerHTML = '<p style="text-align: center; color: gray;">עבור מד, אנא בחר שדה Y מספרי.</p>';
                    return;
                }
                data = [{
                    type: 'indicator',
                    mode: 'gauge+number+delta', // הוסף delta
                    value: values[0], // קח את הערך הראשון
                    title: { text: `מד: ${yAxisTitle}` },
                    delta: { reference: values.length > 1 ? values[1] : 0, relative: true }, // השוואה לערך השני אם קיים
                    gauge: {
                        axis: { range: [null, Math.max(...values) * 1.2 || 100] }, // קנה מידה אוטומטי
                        bar: { color: "darkblue" },
                        bgcolor: "white",
                        borderwidth: 2,
                        bordercolor: "gray",
                        steps: [
                            { range: [0, Math.max(...values) * 0.5 || 50], color: "cyan" },
                            { range: [Math.max(...values) * 0.5 || 50, Math.max(...values) * 0.8 || 80], color: "lightblue" }
                        ],
                        threshold: {
                            line: { color: "red", width: 4 },
                            thickness: 0.75,
                            value: Math.max(...values) * 0.9 || 90
                        }
                    }
                }];
                layout.margin = { t: 50, b: 20, l: 20, r: 20 };
                break;
            case "table": // טבלת נתונים
                // כבר מטופל מחוץ ל-createChart
                break;

            default:
                console.warn(`Unsupported chart type: ${type}`);
                chartDiv.innerHTML = defaultNoDataMessage;
                return;
        }

        Plotly.newPlot(chartDiv, data, layout);
    }

    function createTable(tableId, data, headers) {
        const tableDiv = document.getElementById(tableId);
        if (!tableDiv || !data || data.length === 0 || headers.length === 0) {
            tableDiv.innerHTML = '<p style="text-align: center; color: gray;">בחר קובץ CSV כדי להציג נתונים בטבלה.</p>';
            return;
        }

        let tableHtml = '<table border="1"><thead><tr>';
        headers.forEach(header => {
            tableHtml += `<th>${header}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';

        data.forEach(row => {
            tableHtml += '<tr>';
            headers.forEach(header => {
                tableHtml += `<td>${row[header]}</td>`;
            });
            tableHtml += '</tr>';
        });

        tableHtml += '</tbody></table>';
        tableDiv.innerHTML = tableHtml;
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
        csvDataFieldZSelect.innerHTML = '<option value="">בחר שדה Z (אופציונלי)</option>'; // הוסף ל-Z

        headers.forEach(header => {
            const optionX = document.createElement('option');
            optionX.value = header;
            optionX.textContent = header;
            csvDataFieldXSelect.appendChild(optionX);

            const optionY = document.createElement('option');
            optionY.value = header;
            optionY.textContent = header;
            csvDataFieldYSelect.appendChild(optionY);

            const optionZ = document.createElement('option'); // הוסף ל-Z
            optionZ.value = header;
            optionZ.textContent = header;
            csvDataFieldZSelect.appendChild(optionZ);
        });
    }

    function resetCsvSelection() {
        parsedCsvData = [];
        csvHeaders = [];
        selectedCsvChartData = null;
        csvDataFieldXSelect.innerHTML = '<option value="">בחר שדה X</option>';
        csvDataFieldYSelect.innerHTML = '<option value="">בחר שדה Y</option>';
        csvDataFieldZSelect.innerHTML = '<option value="">בחר שדה Z (אופציונלי)</option>'; //
        csvDataFieldXSelect.style.display = 'none';
        csvDataFieldYSelect.style.display = 'none';
        csvDataFieldZSelect.style.display = 'none'; //
        loadCsvDataBtn.style.display = 'none';
        csvFileInput.value = ''; // נקה את קובץ הקלט
    }

    function saveWidgets() {
        const widgets = Array.from(document.querySelectorAll(".widget")).map(w => {
            let chartDataToSave = null;
            if (w.dataset.type.includes("chart") || w.dataset.type === "gauge-meter") {
                // ננסה לשמור את הנתונים שנשמרו בווידג'ט בעת יצירתו
                if (w.dataset.chartData) {
                    chartDataToSave = JSON.parse(w.dataset.chartData);
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
        storedWidgets.forEach(({ id, type, x, y, width, height, chartData }) => {
            addWidget(type, id, x, y, width, height, chartData);
        });
    }
});
