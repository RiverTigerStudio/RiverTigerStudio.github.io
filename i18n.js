(() => {
	'use strict';

	/** @type {string[]} */
	const SUPPORTED_LOCALES = ['zh', 'zh_TW', 'en', 'ja', 'ko'];
	/** @type {Record<string, string>} */
	const LANGUAGE_TAGS = { zh: 'zh-CN', zh_TW: 'zh-TW', en: 'en', ja: 'ja', ko: 'ko' };
	/** @type {Record<string, Record<string, string>>} */
	let messages = {};
	/** @type {string} */
	let currentLocale = getInitialLocale();
	/** @type {Promise<void>} */
	const ready = fetch('translations.json', { cache: 'no-cache' })
		.then((response) => {
			if (!response.ok) throw new Error(`translations.json: ${response.status}`);
			return response.json();
		})
		.then((data) => {
			messages = data && typeof data === 'object' ? data : {};
			applyTranslations();
		})
		.catch((error) => {
			console.error('[i18n] Unable to load translations:', error);
			messages = {};
			applyTranslations();
		});

	/** @returns {string} */
	function getInitialLocale() {
		/** @type {string | null} */
		let stored = null;
		try { stored = window.localStorage.getItem('jianghu-studio-locale'); } catch (_error) { /* 浏览器禁用存储时使用系统语言。 */ }
		if (stored && SUPPORTED_LOCALES.includes(stored)) return stored;
		const language = (navigator.language || 'zh-CN').toLowerCase();
		if (language.startsWith('zh-tw') || language.startsWith('zh-hk')) return 'zh_TW';
		if (language.startsWith('en')) return 'en';
		if (language.startsWith('ja')) return 'ja';
		if (language.startsWith('ko')) return 'ko';
		return 'zh';
	}

	/** @param {string} key @param {Record<string, unknown>} [params] @returns {string} */
	function tr(key, params = {}) {
		const localeMessages = messages[currentLocale] || {};
		const fallbackMessages = messages.zh || {};
		let text = localeMessages[key] ?? fallbackMessages[key] ?? key;
		return String(text).replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, name) => {
			const value = params[name];
			return value === undefined || value === null ? `{${name}}` : String(value);
		});
	}

	/** @param {Element} [root] */
	function applyTranslations(root = document) {
		root.querySelectorAll('[data-i18n]').forEach((element) => {
			element.textContent = tr(element.getAttribute('data-i18n') || '');
		});
		root.querySelectorAll('*').forEach((element) => {
			Array.from(element.attributes).forEach((attribute) => {
				if (!attribute.name.startsWith('data-i18n-') || attribute.name === 'data-i18n') return;
				const suffix = attribute.name.slice('data-i18n-'.length);
				const targetAttribute = suffix.startsWith('data-') ? suffix : suffix;
				element.setAttribute(targetAttribute, tr(attribute.value));
			});
		});
		const languageSelect = document.getElementById('language-select');
		if (languageSelect instanceof HTMLSelectElement) languageSelect.value = currentLocale;
		document.documentElement.lang = LANGUAGE_TAGS[currentLocale] || 'zh-CN';
		document.dispatchEvent(new CustomEvent('localechange', { detail: { locale: currentLocale } }));
	}

	/** @param {string} locale @returns {Promise<void>} */
	async function setLocale(locale) {
		if (!SUPPORTED_LOCALES.includes(locale)) return ready;
		await ready;
		if (currentLocale === locale) {
			applyTranslations();
			return;
		}
		currentLocale = locale;
		try { window.localStorage.setItem('jianghu-studio-locale', locale); } catch (_error) { /* 语言切换仍可在当前页面生效。 */ }
		applyTranslations();
	}

	window.i18n = {
		ready,
		tr,
		setLocale,
		get locale() { return currentLocale; },
		get supportedLocales() { return [...SUPPORTED_LOCALES]; }
	};

	document.addEventListener('DOMContentLoaded', () => {
		ready.then(() => applyTranslations());
	});
	document.getElementById('language-select')?.addEventListener('change', (event) => {
		const target = /** @type {HTMLSelectElement} */ (event.currentTarget);
		void setLocale(target.value);
	});
})();
