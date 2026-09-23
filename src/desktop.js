// ─────────────────────────────────────────────────────────────────────
// Configurations & Assets globaux
// ─────────────────────────────────────────────────────────────────────
const ALL_APPS_ICON = 'media/icons/all-apps.svg';

// Icône SVG par défaut pour les dossiers du bureau
const FOLDER_ICON_SVG = '<svg xmlns="http://w3.org" viewBox="0 0 24 24" fill="#e0a96d" width="48" height="48"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>';

// ─────────────────────────────────────────────────────────────────────
// Desktop icon element factory
// ─────────────────────────────────────────────────────────────────────
function makeIconEl(item) {
	const isFolder = item.type === 'folder';
	const href = isFolder ? '#' : item.url;
	const target = isFolder ? '_self' : '_blank';

	const iconLink = el('a', { 
		class: `desktop-icon ${isFolder ? 'is-folder' : ''}`, 
		href: href, 
		target: target, 
		rel: 'noopener noreferrer', 
		data: { key: item.key } 
	},
		el('button', { class: 'icon-delete', text: '✕', data: { key: item.key } }),
		el('div', { class: 'icon-img-wrap' }),
		el('span', { class: 'desktop-icon-label', text: item.label }),
	);

	const imgWrap = iconLink.querySelector('.icon-img-wrap');
	
	if (isFolder) {
		imgWrap.innerHTML = FOLDER_ICON_SVG;
		// Événement d'ouverture au clic sur un dossier (si pas en mode édition)
		iconLink.addEventListener('click', (e) => {
			if (!desktopEditing) {
				e.preventDefault();
				openFolder(item);
			}
		});
	} else {
		imgWrap.appendChild(iconArt(item.favicon));
	}

	return iconLink;
}

// ─────────────────────────────────────────────────────────────────────
// Render: desktop icons
// ─────────────────────────────────────────────────────────────────────
function renderDesktopIcons() {
	const grid = $('desktopGrid');
	Array.from(grid.children).forEach(c => { if (!c.classList.contains('desktop-icon-ghost')) c.remove(); });
	S.desktopIcons.forEach(item => {
		const a = makeIconEl(item);
		Object.assign(a.style, {
			position: 'absolute',
			left: (GRID.ox + item.col * GRID.uw) + 'px',
			top:  (GRID.oy + item.row * GRID.uh) + 'px',
		});
		grid.appendChild(a);
	});
}

// ─────────────────────────────────────────────────────────────────────
// Render: dock
// ─────────────────────────────────────────────────────────────────────
function isLockedDockItem(item) {
	return item.locked || CFG.dock.some(d => d !== 'separator' && d.url === item.url && d.locked);
}

function renderDock() {
	const dock = $('dock');
	dock.innerHTML = '';

	dock.appendChild(el('button', { class: 'dock-all-apps', title: 'All Bookmarks', onclick: openAllBookmarks }, iconArtFromSrc(ALL_APPS_ICON)));
	dock.appendChild(el('div', { class: 'dock-sep' }));

	S.dock.forEach((item, dockIdx) => {
		if (item === 'separator') {
			dock.appendChild(el('div', { class: 'dock-sep' }));
			return;
		}
		const a = el('a', { class: 'dock-icon', href: item.url, target: '_blank', rel: 'noopener noreferrer', title: item.label, data: { dockIdx } });

		if (isLockedDockItem(item)) a.classList.add('locked');
		else a.appendChild(el('button', { class: 'dock-icon-delete', text: '✕', data: { dockIdx } }));

		a.appendChild(iconArt(item.favicon));
		dock.appendChild(a);
	});
}

// ─────────────────────────────────────────────────────────────────────
// Desktop edit mode
// ─────────────────────────────────────────────────────────────────────
function enterDesktopEdit() {
	desktopEditing = true;
	$('desktop').classList.add('editing');
	$('dock').classList.add('editing');
	const btn = $('mbEdit');
	btn.classList.add('active'); btn.textContent = 'Done Editing';
}

// ─────────────────────────────────────────────────────────────────────
// Interaction : Dossiers
// ─────────────────────────────────────────────────────────────────────
function openFolder(folderItem) {
	// Fonction à adapter selon le gestionnaire de fenêtres existant de votre projet.
	console.log(`Ouverture du dossier : ${folderItem.label}`, folderItem.children);
	alert(`Ouverture du dossier : ${folderItem.label}\nContenu : ${folderItem.children.length} éléments.`);
}

function exitDesktopEdit() {
	desktopEditing = false;
	$('desktop').classList.remove('editing');
	$('dock').classList.remove('editing');
	const btn = $('mbEdit');
	btn.classList.remove('active'); btn.textContent = 'Edit Desktop';
}

// ─────────────────────────────────────────────────────────────────────
// Desktop icon mutations
// ─────────────────────────────────────────────────────────────────────
function removeDesktopIcon(key) {
	S.desktopIcons = S.desktopIcons.filter(i => i.key !== key);
	saveState(); renderDesktopIcons();
}

function addDesktopIcon(label, url) {
	const domain = domainFrom(url);
	if (S.desktopIcons.some(i => i.url === url)) return false;
	const { col, row } = nextFreeCell(occupiedCells());
	S.desktopIcons.push({ 
		key: 'icon-' + domain.replace(/\./g,'-') + '-' + Date.now(), 
		type: 'link',
		label, 
		url, 
		favicon: domain, 
		col, 
		row 
	});
	saveState(); renderDesktopIcons(); return true;
}

function addDesktopFolder(label = 'Nouveau Dossier') {
	const { col, row } = nextFreeCell(occupiedCells());
	const folderKey = 'folder-' + Date.now();
	
	S.desktopIcons.push({
		key: folderKey,
		type: 'folder',
		label: label,
		col: col,
		row: row,
		children: []
	});
	
	saveState(); 
	renderDesktopIcons(); 
	return true;
}

// ─────────────────────────────────────────────────────────────────────
// Dock mutations
// ─────────────────────────────────────────────────────────────────────
function removeDockItem(dockIdx) {
	S.dock.splice(dockIdx, 1);
	saveState(); renderDock();
}

function moveDesktopIconToDock(key) {
	const idx = S.desktopIcons.findIndex(i => i.key === key);
	if (idx < 0) return;
	const icon = S.desktopIcons[idx];
	
	// Empêcher de mettre un dossier complet directement dans le dock (optionnel)
	if (icon.type === 'folder') return;

	S.desktopIcons.splice(idx, 1);
	if (!S.dock.some(i => i !== 'separator' && i.url === icon.url)) {
		S.dock.push({ label: icon.label, url: icon.url, favicon: icon.favicon });
	}
	saveState(); renderDesktopIcons(); renderDock();
}

function moveDockItemToDesktop(dockIdx) {
	const item = S.dock[dockIdx];
	if (!item || item === 'separator' || isLockedDockItem(item)) return;
	S.dock.splice(dockIdx, 1);
	if (!addDesktopIcon(item.label, item.url)) { saveState(); renderDesktopIcons(); }
	renderDock();
}

// ─────────────────────────────────────────────────────────────────────
// Desktop icon drag: snap to grid cell, swap
// ─────────────────────────────────────────────────────────────────────
function setupDesktopIconDrag() {
	const desktop = $('desktop');
	let active = false, srcKey = null, dragClone = null, dragEl = null, ghostEl = null;
	let targetCol = -1, targetRow = -1, overDock = false;

	desktop.addEventListener('pointerdown', e => {
		if (!desktopEditing) return;
		const icon = e.target.closest('#desktopGrid .desktop-icon');
		if (!icon || e.target.closest('.icon-delete')) return;
		e.preventDefault();

		srcKey = icon.dataset.key;
		dragEl = icon; active = true;

		const item = S.desktopIcons.find(i => i.key === srcKey);
		targetCol = item ? item.col : 0;
		targetRow = item ? item.row : 0;

		const r = icon.getBoundingClientRect();
		dragClone = makeDragClone(icon, r);
		icon.style.opacity = '0.15';

		ghostEl = document.createElement('div');
		ghostEl.className = 'desktop-icon-ghost';
		ghostEl.style.left = (GRID.ox + targetCol * GRID.uw) + 'px';
		ghostEl.style.top  = (GRID.oy + targetRow * GRID.uh) + 'px';
		$('desktopGrid').appendChild(ghostEl);

		desktop.setPointerCapture(e.pointerId);
	});

	desktop.addEventListener('pointermove', e => {
		if (!active || !dragClone) return;
		e.preventDefault();
		dragClone.style.left = (e.clientX - dragClone.offsetWidth  / 2) + 'px';
		dragClone.style.top  = (e.clientY - dragClone.offsetHeight / 2) + 'px';

		const under = document.elementFromPoint(e.clientX, e.clientY);
		overDock = !!(under && under.closest('#dock'));
		$('dock').classList.toggle('drop-target', overDock);
		if (ghostEl) ghostEl.style.display = overDock ? 'none' : '';
		if (overDock) return;

		const col = Math.round((e.clientX - GRID.ox - 57) / GRID.uw);
		const row = Math.round((e.clientY - GRID.oy - 57) / GRID.uh);
		const nc  = Math.max(0, col);
		const nr  = Math.max(0, row);
		if (nc !== targetCol || nr !== targetRow) {
			targetCol = nc; targetRow = nr;
			if (ghostEl) {
				ghostEl.style.left = (GRID.ox + targetCol * GRID.uw) + 'px';
				ghostEl.style.top  = (GRID.oy + targetRow * GRID.uh) + 'px';
			}
		}
	});

	function endDesktopDrag() {
		if (!active) return;
		active = false;
		const fKey = srcKey, fCol = targetCol, fRow = targetRow, fOverDock = overDock;
		dragClone && dragClone.remove(); dragClone = null;
		if (dragEl) { dragEl.style.opacity = ''; dragEl = null; }
		if (ghostEl) { ghostEl.remove(); ghostEl = null; }
		$('dock').classList.remove('drop-target');
		srcKey = null; targetCol = targetRow = -1; overDock = false;

		if (!fKey) return;
		if (fOverDock) { moveDesktopIconToDock(fKey); return; }
		if (fCol < 0 || fRow < 0) return;
		const src = S.desktopIcons.find(i => i.key === fKey);
		if (!src || (src.col === fCol && src.row === fRow)) return;
		const tgt = S.desktopIcons.find(i => i.col === fCol && i.row === fRow && i.key !== fKey);
		if (tgt) { const oc = src.col, or = src.row; src.col = fCol; src.row = fRow; tgt.col = oc; tgt.row = or; }
		else { src.col = fCol; src.row = fRow; }
		saveState(); renderDesktopIcons();
	}

	desktop.addEventListener('pointerup',          endDesktopDrag);
	desktop.addEventListener('lostpointercapture', endDesktopDrag);
}

// ─────────────────────────────────────────────────────────────────────
// Dock drag: reorder icons within the dock
// ─────────────────────────────────────────────────────────────────────
let dockDragging = false;

function setupDockDrag() {
