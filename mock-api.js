(() => {
	'use strict';

	const FEEDBACK_KEY = 'jianghu-studio-feedback-v1';
	const SUPPORT_KEY = 'jianghu-studio-support-v1';
	const feedbackCategories = new Set(['experience', 'suggestion', 'bug', 'other']);
	const supportCategories = new Set(['gameplay', 'purchase', 'technical', 'cooperation', 'other']);
	const legacyCategories = { '体验反馈': 'experience', '玩法建议': 'suggestion', '问题报告': 'bug', '游戏问题': 'gameplay', '账号与购买': 'purchase', '技术支持': 'technical', '合作洽谈': 'cooperation', '其他': 'other' };
	const seedFeedback = [
		{
			id: 'seed-01', nickname: '北境旅人', rating: 5, category: 'suggestion',
			content: '冰火两侧的构筑差异很有意思，希望之后能看到更多路线分支。',
			createdAt: '2026-09-18T09:30:00.000Z'
		},
		{
			id: 'seed-02', nickname: '小满', rating: 4, category: 'experience',
			content: '喜欢营地和战斗之间的节奏，卡面信息再大一点就更舒服了。',
			createdAt: '2026-09-12T04:10:00.000Z'
		},
		{
			id: 'seed-03', nickname: 'Kitsune', rating: 5, category: 'other',
			content: '美术气质很独特，期待后续更新。',
			createdAt: '2026-09-06T12:20:00.000Z'
		}
	];

	const wait = (value, ms = 360) => new Promise((resolve) => window.setTimeout(() => resolve(value), ms));
	const asText = (value) => typeof value === 'string' ? value.trim() : '';
	const storageError = () => {
		const error = new Error('Local mock storage is unavailable.');
		error.code = 'STORAGE_ERROR';
		return error;
	};
	const readList = (key, fallback) => {
		try {
			const saved = JSON.parse(window.localStorage.getItem(key) || 'null');
			return Array.isArray(saved) ? saved : fallback.map((item) => ({ ...item }));
		} catch (_error) {
			return fallback.map((item) => ({ ...item }));
		}
	};
	const writeList = (key, items) => {
		try {
			window.localStorage.setItem(key, JSON.stringify(items));
		} catch (_error) {
			throw storageError();
		}
	};
	const normalizeCategory = (value, allowed) => {
		const category = legacyCategories[asText(value)] || asText(value);
		return allowed.has(category) ? category : 'other';
	};
	const normalizeRating = (value) => Math.min(5, Math.max(1, Number.parseInt(value, 10) || 5));
	const ensureContent = (value, fieldName) => {
		const content = asText(value);
		if (content.length < 8) {
			const error = new Error(`${fieldName} is too short.`);
			error.code = 'INVALID_INPUT';
			throw error;
		}
		return content;
	};

	window.mockApi = Object.freeze({
		async getFeedback() {
			const items = readList(FEEDBACK_KEY, seedFeedback).map((item) => ({ ...item, category: normalizeCategory(item.category, feedbackCategories) }));
			return wait(items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
		},
		async submitFeedback(payload = {}) {
			const item = {
				id: `feedback-${Date.now()}`,
				nickname: asText(payload.nickname) || '匿名玩家',
				rating: normalizeRating(payload.rating),
				category: normalizeCategory(payload.category, feedbackCategories),
				content: ensureContent(payload.content, 'Feedback'),
				createdAt: new Date().toISOString()
			};
			writeList(FEEDBACK_KEY, [item, ...readList(FEEDBACK_KEY, seedFeedback)]);
			return wait(item, 520);
		},
		async submitSupport(payload = {}) {
			const email = asText(payload.email);
			if (!email || !email.includes('@')) {
				const error = new Error('A valid email is required.');
				error.code = 'INVALID_INPUT';
				throw error;
			}
			const ticket = {
				id: `ticket-${Date.now().toString(36).toUpperCase()}`,
				status: 'received',
				email,
				category: normalizeCategory(payload.category, supportCategories),
				message: ensureContent(payload.message, 'Support message'),
				createdAt: new Date().toISOString()
			};
			writeList(SUPPORT_KEY, [ticket, ...readList(SUPPORT_KEY, [])]);
			return wait(ticket, 620);
		},
		async getSupportTickets() {
			return wait(readList(SUPPORT_KEY, []));
		}
	});
})();
