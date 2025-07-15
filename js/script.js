document.addEventListener('DOMContentLoaded', function () {
    async function main() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) {
                throw new Error(`Failed to load data.json: ${response.statusText}`);
            }
            const appData = await response.json();
            initializeApp(appData.species, appData.recommendations);
        } catch (error) {
            console.error("Could not initialize the application:", error);
            const explorer = document.getElementById('explorer');
            if(explorer) {
                explorer.innerHTML = `<p class="text-center text-red-600 font-semibold">Error: Could not load commodity data. Please check the console for details.</p>`;
            }
        }
    }

    function initializeApp(speciesData, recommendationsData) {
        Chart.register(ChartDataLabels);
        const speciesGrid = document.getElementById('speciesGrid');
        const categoryFilterButton = document.getElementById('categoryFilterButton');
        const categoryFilterDropdown = document.getElementById('categoryFilterDropdown');
        const linkageFilterGroup = document.getElementById('linkageFilterGroup');
        const stateFilterGroup = document.getElementById('stateFilterGroup');
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const closeModalBtn = document.getElementById('closeModal');
        const recommendationsContainer = document.getElementById('recommendationsContainer');
        const speciesCountEl = document.getElementById('speciesCount');
        let modalChart = null;

        function getLinkageIcon(linkage) {
            if (linkage === 'Backward') return { icon: '⬅️', color: 'bg-red-100 text-red-800', tooltip: 'Backward Linkage: Focus on supply, cultivation, and collection.' };
            if (linkage === 'Forward') return { icon: '➡️', color: 'bg-green-100 text-green-800', tooltip: 'Forward Linkage: Focus on processing, branding, and market access.' };
            return { icon: '⬅️➡️', color: 'bg-blue-100 text-blue-800', tooltip: 'Integrated Linkage: Requires focus on both supply and market sides.' };
        }
        
        function renderSpecies(filteredData) {
            speciesGrid.innerHTML = '';
            document.getElementById('resultsCount').textContent = `${filteredData.length} Species Found`;
            const sortedData = filteredData.sort((a, b) => a.name.localeCompare(b.name));
            const template = document.getElementById('species-card-template');

            sortedData.forEach(species => {
                const card = template.content.cloneNode(true);
                const linkageInfo = getLinkageIcon(species.linkage);

                const imageEl = card.querySelector('.image');
                imageEl.src = species.image;
                imageEl.alt = species.name;
                imageEl.onerror = () => { imageEl.src = `https://placehold.co/600x400/e2e8f0/64748b?text=${species.name.replace(/ /g, '+')}`; };

                const linkageIconEl = card.querySelector('.linkage-icon');
                linkageIconEl.title = linkageInfo.tooltip;
                linkageIconEl.textContent = linkageInfo.icon;
                linkageIconEl.classList.add(...linkageInfo.color.split(' '));

                card.querySelector('.species-name').textContent = species.name;
                card.querySelector('.botanical-name').textContent = species.botanical;
                card.querySelector('.strength').textContent = species.strength;

                const linkageTagEl = card.querySelector('.linkage-tag');
                linkageTagEl.textContent = `${species.linkage} Linkage`;
                linkageTagEl.classList.add(...linkageInfo.color.split(' '));
                card.querySelector('.category-tag').textContent = species.category.split(' ')[0];

                const stateTagsContainer = card.querySelector('.state-tags');
                stateTagsContainer.innerHTML = species.states.map(s => `<span class="inline-block bg-slate-200 text-slate-700 text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full">${s}</span>`).join('');

                card.querySelector('.card').addEventListener('click', () => showModal(species));
                card.querySelector('.card').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') showModal(species); });
                
                speciesGrid.appendChild(card);
            });
        }    
        
        function renderRecommendationCards() {
            if (!recommendationsContainer) return;
            recommendationsContainer.innerHTML = '';
            recommendationsData.forEach((item) => {
                const card = document.createElement('div');
                card.className = 'bg-white p-6 rounded-xl shadow-lg border-[1.6px] border-slate-300 flex flex-col';
                card.innerHTML = `
                    <h4 class="text-xl font-bold text-blue-900 mb-4">${item.title}</h4>
                    <div class="text-slate-600 space-y-2">${item.content}</div>
                `;
                recommendationsContainer.appendChild(card);
            });
        }

        function populateFilters() {
            const categoryHierarchy = {
                'Agro-Commodity': [...new Set(speciesData.filter(s => s.primaryCategory === 'Agro-Commodity').map(s => s.category))].sort(),
                'NTFP': [...new Set(speciesData.filter(s => s.primaryCategory === 'NTFP').map(s => s.category))].sort()
            };
            categoryFilterDropdown.innerHTML = '';
            for (const majorCategory in categoryHierarchy) {
                const majorCatDiv = document.createElement('div');
                majorCatDiv.className = 'mb-3';
                const majorLabel = document.createElement('label');
                majorLabel.className = 'flex items-center space-x-2 font-bold text-blue-900 cursor-pointer';
                const majorCheckbox = document.createElement('input');
                majorCheckbox.type = 'checkbox';
                majorCheckbox.className = 'major-checkbox rounded';
                majorCheckbox.dataset.major = majorCategory;
                majorLabel.appendChild(majorCheckbox);
                majorLabel.appendChild(document.createTextNode(majorCategory));
                majorCatDiv.appendChild(majorLabel);
                const subCatContainer = document.createElement('div');
                subCatContainer.className = 'pl-6 mt-1 space-y-1';
                categoryHierarchy[majorCategory].forEach(subCategory => {
                    const subLabel = document.createElement('label');
                    subLabel.className = 'flex items-center space-x-2 text-slate-700 font-normal cursor-pointer';
                    const subCheckbox = document.createElement('input');
                    subCheckbox.type = 'checkbox';
                    subCheckbox.value = subCategory;
                    subCheckbox.className = 'sub-checkbox rounded';
                    subCheckbox.dataset.parent = majorCategory;
                    subLabel.appendChild(subCheckbox);
                    subLabel.appendChild(document.createTextNode(subCategory));
                    subCatContainer.appendChild(subLabel);
                });
                majorCatDiv.appendChild(subCatContainer);
                categoryFilterDropdown.appendChild(majorCatDiv);
            }
        }

        function showModal(species) {
            modalTitle.textContent = species.name;
            let productsHtml = species.products.map(p => `<li class="text-slate-600">${p}</li>`).join('');
            let sourcesHtml = '';
            if (species.sources && species.sources.length > 0) {
                const sourceLinks = species.sources.map(source => `<li><a href="${source.url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">${source.name}</a></li>`).join('');
                sourcesHtml = `<h5 class="font-bold text-slate-800 mb-2 mt-4">Source(s)</h5><ul class="list-disc list-inside space-y-1">${sourceLinks}</ul>`;
            }
            modalBody.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:items-start">
                    <div>
                        <p class="text-sm text-slate-500 italic mb-4">${species.botanical}</p>
                        <h5 class="font-bold text-slate-800 mb-2">Core Strength & Market Driver</h5>
                        <p class="text-slate-600 mb-4">${species.strength}</p>
                        <h5 class="font-bold text-slate-800 mb-2">Key Value-Added Products</h5>
                        <ul class="list-disc list-inside space-y-1 mb-4">${productsHtml}</ul>
                        <h5 class="font-bold text-slate-800 mb-2">Strategic Intervention Priority: <span class="text-blue-700">${species.linkage}</span></h5>
                        <p class="text-slate-600">${species.justification}</p>
                        ${sourcesHtml}
                    </div>
                    <div class="flex items-center justify-center min-h-[175px] bg-slate-50 rounded-lg overflow-hidden">
                        ${species.chartData 
                            ? `<div class="chart-container relative h-64 md:h-80 w-full max-w-md mx-auto"><canvas id="modalChartCanvas"></canvas></div>` 
                            : `<img src="${species.image}" alt="Image of ${species.name}" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='https://placehold.co/600x400/e2e8f0/64748b?text=${encodeURIComponent(species.name)}';">`
                        }
                    </div>
                </div>`;
            document.body.classList.add('modal-open');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            setTimeout(() => { modal.querySelector('.modal-content').classList.remove('scale-95'); modal.classList.remove('opacity-0'); }, 10);
            if (species.chartData) {
                const ctx = document.getElementById('modalChartCanvas').getContext('2d');
                if (modalChart) modalChart.destroy();
                modalChart = new Chart(ctx, { type: species.chartData.type, data: { labels: species.chartData.labels, datasets: [{ label: 'Tonnes', data: species.chartData.values, backgroundColor: ['rgba(59, 130, 246, 0.5)', 'rgba(239, 68, 68, 0.5)'], borderColor: ['rgba(59, 130, 246, 1)', 'rgba(239, 68, 68, 1)'], borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: species.chartData.title, font: { size: 14 } } }, scales: { y: { beginAtZero: true } } } });
            }
        }
        function hideModal() {
            document.body.classList.remove('modal-open');
            modal.querySelector('.modal-content').classList.add('scale-95');
            modal.classList.add('opacity-0');
            setTimeout(() => { modal.classList.add('hidden'); modal.classList.remove('flex'); if (modalChart) { modalChart.destroy(); modalChart = null; } }, 300);
        }

        function applyFilters() {
            const checkedCategories = Array.from(document.querySelectorAll('#categoryFilterDropdown .sub-checkbox:checked')).map(cb => cb.value);
            const link = linkageFilterGroup.querySelector('.active-filter').dataset.value;
            const state = stateFilterGroup.querySelector('.active-filter').dataset.value;
            const filtered = speciesData.filter(s => {
                const categoryMatch = checkedCategories.length === 0 || checkedCategories.includes(s.category);
                const linkageMatch = link === 'all' || s.linkage === link;
                const stateMatch = state === 'all' || s.states.includes(state);
                return categoryMatch && linkageMatch && stateMatch;
            });
            renderSpecies(filtered);
        }

        function updateSummaryMetrics() {
            const total = speciesData.length;
            speciesCountEl.textContent = total;
        }
        
        function renderDashboardCharts() {
            const linkageCounts = speciesData.reduce((acc, curr) => { acc[curr.linkage] = (acc[curr.linkage] || 0) + 1; return acc; }, {});
            const sortedLinkageLabels = Object.keys(linkageCounts).sort();
            const sortedLinkageValues = sortedLinkageLabels.map(label => linkageCounts[label]);
            new Chart(document.getElementById('linkageChart').getContext('2d'), { type: 'doughnut', data: { labels: sortedLinkageLabels, datasets: [{ data: sortedLinkageValues, backgroundColor: ['rgba(239, 68, 68, 0.7)', 'rgba(34, 197, 94, 0.7)', 'rgba(59, 130, 246, 0.7)'], borderColor: ['#fff'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, datalabels: { formatter: (v) => v, color: '#fff', font: { weight: 'bold', size: 16 } } } } });

            const categoryCounts = speciesData.reduce((acc, curr) => {
                const category = curr.category || 'Uncategorized';
                acc[category] = (acc[category] || 0) + 1;
                return acc;
            }, {});
            const sortedCategories = Object.entries(categoryCounts).sort(([,a],[,b]) => b - a);
            new Chart(document.getElementById('categoryBarChart').getContext('2d'), {
                type: 'bar',
                data: {
                    labels: sortedCategories.map(item => item[0]),
                    datasets: [{
                        label: 'Number of Species',
                        data: sortedCategories.map(item => item[1]),
                        backgroundColor: 'rgba(59, 130, 246, 0.7)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', color: '#1e3a8a', font: { weight: 'bold' } } },
                    scales: { y: { grid: { display: false }, beginAtZero: true, ticks: { stepSize: 20 } }, x: { ticks: { autoSkip: false, maxRotation: 45, minRotation: 45 } } }
                }
            });

            const sets = {
                Rajasthan: new Set(speciesData.filter(s => s.states.includes('Rajasthan')).map(s => s.name)),
                Haryana: new Set(speciesData.filter(s => s.states.includes('Haryana')).map(s => s.name)),
                Delhi: new Set(speciesData.filter(s => s.states.includes('Delhi')).map(s => s.name)),
            };
            const vennData = [
                { sets: ['Rajasthan'], value: sets.Rajasthan.size }, { sets: ['Haryana'], value: sets.Haryana.size }, { sets: ['Delhi'], value: sets.Delhi.size },
                { sets: ['Rajasthan', 'Haryana'], value: [...sets.Rajasthan].filter(name => sets.Haryana.has(name)).length },
                { sets: ['Rajasthan', 'Delhi'], value: [...sets.Rajasthan].filter(name => sets.Delhi.has(name)).length },
                { sets: ['Haryana', 'Delhi'], value: [...sets.Haryana].filter(name => sets.Delhi.has(name)).length },
                { sets: ['Rajasthan', 'Haryana', 'Delhi'], value: [...sets.Rajasthan].filter(name => sets.Haryana.has(name) && sets.Delhi.has(name)).length },
            ];
            const vennColors = {
                fill: {
                    rajasthan: 'rgba(236, 72, 153, 0.6)', haryana: 'rgba(34, 197, 94, 0.6)', delhi: 'rgba(59, 130, 246, 0.6)',
                    raj_har: 'rgba(217, 119, 6, 0.6)', raj_del: 'rgba(168, 85, 247, 0.6)', har_del: 'rgba(20, 184, 166, 0.6)', all: 'rgba(107, 114, 128, 0.7)'
                },
                stroke: {
                    rajasthan: 'rgb(219, 39, 119)', haryana: 'rgb(22, 163, 74)', delhi: 'rgb(37, 99, 235)',
                    raj_har: 'rgb(180, 83, 9)', raj_del: 'rgb(147, 51, 234)', har_del: 'rgb(13, 148, 136)', all: 'rgb(75, 85, 99)'
                }
            };
            function getColor(context, type) {
                const sets = context.raw.sets;
                if (sets.length === 3) return vennColors[type].all;
                if (sets.length === 2) {
                    if (sets.includes('Rajasthan') && sets.includes('Haryana')) return vennColors[type].raj_har;
                    if (sets.includes('Rajasthan') && sets.includes('Delhi')) return vennColors[type].raj_del;
                    if (sets.includes('Haryana') && sets.includes('Delhi')) return vennColors[type].har_del;
                }
                if (sets.length === 1) {
                    if (sets.includes('Rajasthan')) return vennColors[type].rajasthan;
                    if (sets.includes('Haryana')) return vennColors[type].haryana;
                    if (sets.includes('Delhi')) return vennColors[type].delhi;
                }
                return 'rgba(200, 200, 200, 0.5)';
            }
            new Chart(document.getElementById('stateVennDiagram').getContext('2d'), {
                type: 'venn',
                data: {
                    labels: ['Rajasthan', 'Haryana', 'Delhi'],
                    datasets: [{
                        label: 'State Overlap', data: vennData,
                        backgroundColor: (context) => getColor(context, 'fill'),
                        borderColor: (context) => getColor(context, 'stroke'),
                        borderWidth: 1.5
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: {
                        datalabels: {
                            display: (c) => { const d = c.dataset.data[c.dataIndex]; return d && typeof d.value === 'number'; },
                            formatter: (v, c) => c.dataset.data[c.dataIndex].value,
                            color: '#1f2937',
                            font: function(c) { const d = c.dataset.data[c.dataIndex]; const i = d && d.sets && d.sets.length === 1; return { weight: i ? 'bold' : 'normal', size: 14 }; }
                        },
                        legend: { display: false }
                    }
                }
            });
        }

        linkageFilterGroup.addEventListener('click', (e) => handleFilterButtonClick(e, linkageFilterGroup));
        stateFilterGroup.addEventListener('click', (e) => handleFilterButtonClick(e, stateFilterGroup));
        function handleFilterButtonClick(event, groupElement) {
            const clickedButton = event.target.closest('button');
            if (!clickedButton) return;
            groupElement.querySelectorAll('button').forEach(button => { button.classList.remove('active-filter'); button.classList.add('inactive-filter'); });
            clickedButton.classList.add('active-filter');
            clickedButton.classList.remove('inactive-filter');
            applyFilters();
        }
        categoryFilterDropdown.addEventListener('change', (e) => {
            if (e.target.classList.contains('major-checkbox')) {
                const majorCat = e.target.dataset.major;
                categoryFilterDropdown.querySelectorAll(`.sub-checkbox[data-parent="${majorCat}"]`).forEach(sub => sub.checked = e.target.checked);
            }
            applyFilters();
        });
        categoryFilterButton.addEventListener('click', (e) => { e.stopPropagation(); categoryFilterDropdown.classList.toggle('show'); });
        document.addEventListener('click', (e) => { if (!categoryFilterDropdown.contains(e.target) && !categoryFilterButton.contains(e.target)) { categoryFilterDropdown.classList.remove('show'); } });
        closeModalBtn.addEventListener('click', hideModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) hideModal(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) hideModal(); });
        
        updateSummaryMetrics();
        populateFilters();
        renderSpecies(speciesData);
        renderRecommendationCards();
        renderDashboardCharts();
    }

    main();
});