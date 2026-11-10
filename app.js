(() => {
	'use strict';

	const byId = (id) => document.getElementById(id);
	const header = document.querySelector('.site-header');
	const menuToggle = document.querySelector('.menu-toggle');
	const toast = byId('toast');
	let toastTimer = 0;
	const dialogTriggers = new WeakMap();
	let lightboxTrigger = null;
	const fallbackText = {
		WEB_LOADING: '正在加载', WEB_FEEDBACK_COUNT: '{count} 条玩家留言',
		WEB_FEEDBACK_LOAD_ERROR: '留言加载失败', WEB_RATING_STARS: '{rating} 星',
		WEB_ANONYMOUS: '匿名玩家', WEB_SUBMITTING: '正在提交 …', WEB_SENDING: '正在发送 …',
		WEB_FEEDBACK_SUBMIT: '提交给江虎工作室 ↗', WEB_SUPPORT_SUBMIT: '发送工单 ↗',
		WEB_FEEDBACK_SUCCESS: '反馈已保存，谢谢你把这一局留给我们。', WEB_SUPPORT_SUCCESS: '演示工单已保存：{id}',
		WEB_SUBMIT_ERROR: '提交失败，请稍后重试。', WEB_INVALID_INPUT: '请检查表单内容。',
		WEB_STORAGE_ERROR: '本地演示存储不可用，请检查浏览器设置。', WEB_MENU_OPEN: '打开导航', WEB_MENU_CLOSE: '关闭导航', WEB_SAMPLE_BADGE: '示例'
	};
	const tr = (key, params = {}) => {
		if (window.i18n && typeof window.i18n.tr === 'function') return window.i18n.tr(key, params);
		return Object.keys(params).reduce((text, name) => text.replaceAll(`{${name}}`, String(params[name])), fallbackText[key] || key);
	};
	const localeForDate = () => ({ zh: 'zh-CN', zh_TW: 'zh-TW', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR' }[window.i18n?.locale] || 'zh-CN');
	const showToast = (message) => {
		if (!toast) return;
		window.clearTimeout(toastTimer);
		toast.textContent = message;
		toast.classList.add('is-visible');
		toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3600);
	};
	const closeDialog = (dialog) => {
		if (!dialog) return;
		if (dialog.open && typeof dialog.close === 'function') dialog.close();
		const trigger = dialogTriggers.get(dialog);
		if (trigger) window.requestAnimationFrame(() => trigger.focus());
	};
	const openDialog = (id, trigger) => {
		const dialog = byId(id);
		if (!dialog) return;
		dialog.querySelectorAll('.form-status').forEach((status) => { status.textContent = ''; delete status.dataset.state; });
		const result = dialog.querySelector('output');
		if (result) result.textContent = '';
		const category = dialog.querySelector('select[name="category"]');
		if (category && trigger?.dataset.defaultCategory) category.value = trigger.dataset.defaultCategory;
		if (trigger) dialogTriggers.set(dialog, trigger);
		if (typeof dialog.showModal === 'function') dialog.showModal();
		else dialog.classList.add('is-open');
	};
	const setFormStatus = (form, key, params = {}, isError = false) => {
		const status = form?.querySelector('.form-status');
		if (!status) return;
		status.textContent = tr(key, params);
		status.dataset.state = isError ? 'error' : 'success';
	};
	const errorKey = (error) => error?.code === 'INVALID_INPUT' ? 'WEB_INVALID_INPUT' : error?.code === 'STORAGE_ERROR' ? 'WEB_STORAGE_ERROR' : 'WEB_SUBMIT_ERROR';
	const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
	const categoryLabel = (category) => {
		const key = `WEB_CATEGORY_${String(category || 'other').toUpperCase()}`;
		return tr(key);
	};
	const seedTranslation = (id, suffix, fallback) => {
		const match = /^seed-(0[1-3])$/.exec(String(id || ''));
		return match ? tr(`WEB_SEED_${match[1]}_${suffix}`) : fallback;
	};

	menuToggle?.addEventListener('click', () => {
		const isOpen = header.classList.toggle('nav-open');
		menuToggle.setAttribute('aria-expanded', String(isOpen));
		menuToggle.setAttribute('aria-label', tr(isOpen ? 'WEB_MENU_CLOSE' : 'WEB_MENU_OPEN'));
	});
	document.querySelectorAll('.main-nav a').forEach((link) => link.addEventListener('click', () => {
		header?.classList.remove('nav-open');
		menuToggle?.setAttribute('aria-expanded', 'false');
		if (menuToggle) menuToggle.setAttribute('aria-label', tr('WEB_MENU_OPEN'));
	}));
	document.querySelectorAll('[data-dialog]').forEach((button) => button.addEventListener('click', () => openDialog(button.dataset.dialog, button)));
	document.querySelectorAll('.modal-close').forEach((button) => button.addEventListener('click', () => closeDialog(button.closest('dialog'))));
	document.querySelectorAll('dialog.modal').forEach((dialog) => dialog.addEventListener('click', (event) => { if (event.target === dialog) closeDialog(dialog); }));

	const renderFeedback = (items) => {
		const list = byId('feedback-list');
		const count = byId('feedback-count');
		if (!list || !count) return;
		const safeItems = Array.isArray(items) ? items : [];
		count.textContent = tr('WEB_FEEDBACK_COUNT', { count: safeItems.length });
		list.innerHTML = safeItems.slice(0, 6).map((item) => {
			const rating = Math.min(5, Math.max(1, Number(item.rating) || 5));
			const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
			const dateValue = new Date(item.createdAt);
			const date = Number.isNaN(dateValue.valueOf()) ? '' : new Intl.DateTimeFormat(localeForDate(), { month: '2-digit', day: '2-digit' }).format(dateValue);
			const nickname = seedTranslation(item.id, 'NAME', item.nickname || tr('WEB_ANONYMOUS'));
			const content = seedTranslation(item.id, 'CONTENT', item.content);
			const sampleBadge = /^seed-/.test(String(item.id || '')) ? `<span class="feedback-sample-badge">${escapeHtml(tr('WEB_SAMPLE_BADGE'))}</span>` : '';
			return `<article class="feedback-item"><div class="feedback-stars" aria-label="${escapeHtml(tr('WEB_RATING_STARS', { rating }))}">${stars}</div>${sampleBadge}<p>${escapeHtml(content)}</p><footer><span>${escapeHtml(nickname)} · ${escapeHtml(date)}</span><span>${escapeHtml(categoryLabel(item.category))}</span></footer></article>`;
		}).join('');
	};
	const loadFeedback = async () => {
		const count = byId('feedback-count');
		if (count) count.textContent = tr('WEB_LOADING');
		try {
			renderFeedback(await window.mockApi.getFeedback());
		} catch (_error) {
			if (count) count.textContent = tr('WEB_FEEDBACK_LOAD_ERROR');
		}
	};

	const submitForm = async (form, submitter, apiCall, successKey, successParams, resultId) => {
		const defaultKey = submitter.dataset.i18n || (form.id === 'feedback-form' ? 'WEB_FEEDBACK_SUBMIT' : 'WEB_SUPPORT_SUBMIT');
		submitButton(submitter, form.id === 'support-form' ? 'WEB_SENDING' : 'WEB_SUBMITTING');
		try {
			const result = await apiCall(Object.fromEntries(new FormData(form).entries()));
			form.reset();
			setFormStatus(form, successKey, successParams(result));
			if (resultId) {
				const resultNode = byId(resultId);
				if (resultNode) resultNode.textContent = tr(successKey, successParams(result));
			}
			return result;
		} catch (error) {
			const key = errorKey(error);
			setFormStatus(form, key, {}, true);
			showToast(tr(key));
			return null;
		} finally {
			if (submitter) {
				submitter.disabled = false;
				submitter.textContent = tr(defaultKey);
			}
		}
	};
	const submitButton = (button, key) => {
		if (!button) return;
		button.disabled = true;
		button.textContent = tr(key);
	};

	byId('feedback-form')?.addEventListener('submit', async (event) => {
		event.preventDefault();
		const form = event.currentTarget;
		const button = form.querySelector('button[type="submit"]');
		const result = await submitForm(form, button, (payload) => window.mockApi.submitFeedback(payload), 'WEB_FEEDBACK_SUCCESS', () => ({}));
		if (!result) return;
		byId('rate-5') && (byId('rate-5').checked = true);
		closeDialog(byId('feedback-dialog'));
		await loadFeedback();
		showToast(tr('WEB_FEEDBACK_SUCCESS'));
	});
	byId('support-form')?.addEventListener('submit', async (event) => {
		event.preventDefault();
		const form = event.currentTarget;
		const button = form.querySelector('button[type="submit"]');
		const result = await submitForm(form, button, (payload) => window.mockApi.submitSupport(payload), 'WEB_SUPPORT_SUCCESS', (ticket) => ({ id: ticket.id }), 'support-result');
		if (!result) return;
		showToast(tr('WEB_SUPPORT_SUCCESS', { id: result.id }));
	});

	const lightbox = byId('lightbox');
	const lightboxImage = lightbox?.querySelector('img');
	const lightboxCaption = lightbox?.querySelector('figcaption');
	const qrDownload = lightbox?.querySelector('.qr-download');
	const closeLightbox = () => {
		if (!lightbox) return;
		if (lightbox.open && typeof lightbox.close === 'function') lightbox.close();
		lightbox.classList.remove('is-open');
		lightbox.classList.remove('is-qr');
		if (qrDownload) { qrDownload.hidden = true; qrDownload.removeAttribute('href'); }
		if (!lightbox.open) lightbox.removeAttribute('aria-hidden');
		if (lightboxImage) lightboxImage.removeAttribute('src');
		const trigger = lightboxTrigger;
		if (trigger) window.requestAnimationFrame(() => trigger.focus());
		lightboxTrigger = null;
	};
	document.querySelectorAll('[data-lightbox]').forEach((card) => card.addEventListener('click', () => {
		if (!lightbox || !lightboxImage) return;
		lightboxTrigger = card;
		const isQr = card.classList.contains('mini-game-qr');
		lightbox.classList.toggle('is-qr', isQr);
		if (qrDownload) {
			qrDownload.hidden = !isQr;
			if (isQr) qrDownload.href = card.dataset.lightbox;
		}
		lightboxImage.src = card.dataset.lightbox;
		lightboxImage.alt = card.querySelector('img')?.alt || '';
		if (lightboxCaption) lightboxCaption.textContent = card.dataset.caption || '';
		if (typeof lightbox.showModal === 'function') lightbox.showModal();
		else { lightbox.classList.add('is-open'); lightbox.setAttribute('aria-hidden', 'false'); }
	}));
	lightbox?.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
	lightbox?.addEventListener('click', (event) => { if (event.target === lightbox) closeLightbox(); });
	document.addEventListener('keydown', (event) => {
		if (event.key !== 'Escape') return;
		header?.classList.remove('nav-open');
		menuToggle?.setAttribute('aria-expanded', 'false');
		menuToggle?.setAttribute('aria-label', tr('WEB_MENU_OPEN'));
		closeLightbox();
		document.querySelectorAll('dialog.modal[open]').forEach(closeDialog);
	});
	document.addEventListener('localechange', () => { loadFeedback(); });
	loadFeedback();
})();
