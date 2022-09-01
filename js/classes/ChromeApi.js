'use strict';

class ChromeApi
{
	/**
	 *
	 * @type {[function]}
	 * @private
	 */
	_changedListeners = [];

	constructor()
	{
		chrome.storage.onChanged.addListener((changes, namespace) => this._processStorageChanged(changes, namespace));
	}

	/**
	 *
	 * @param {object} changes
	 * @param {string} namespace
	 * @private
	 */
	_processStorageChanged(changes, namespace)
	{
		this._changedListeners.forEach(x => x(changes, namespace));
	}

	/**
	 *
	 * @param {string} key
	 * @returns {Promise<object>}
	 */
	async storageGet(key)
	{
		return new Promise(resolve => {
			chrome.storage.local.get([key], response => {
				resolve(response[key] ?? null);
			});
		});
	}

	/**
	 *
	 * @param {object} data
	 * @returns {Promise<any>}
	 */
	async storageSet(data)
	{
		return new Promise(resolve => {
			chrome.storage.local.set(data, response => {
				resolve(response);
			});
		});
	}

	/**
	 *
	 * @returns {Promise<Config>}
	 */
	async getConfig()
	{
		return this.storageGet('config');
	}

	/**
	 *
	 * @param {Config} config
	 * @returns {Promise<any>}
	 */
	async setConfig(config)
	{
		if (typeof config.requests === 'string')
		{
			config.requests = parseInt(config.requests);
		}
		if (typeof config.deepl_texts_per_request === 'string')
		{
			config.deepl_texts_per_request = parseInt(config.deepl_texts_per_request);
		}

		return this.storageSet({config: config});
	}

	/**
	 *
	 * @param {function} listener
	 */
	onStorageChanged(listener)
	{
		this._changedListeners.push(listener);
	}

	/**
	 *
	 * @param {any} request
	 * @returns {Promise<any>}
	 */
	async send(request)
	{
		return chrome.runtime.sendMessage(request);
	}

	/**
	 *
	 * @param {object} query
	 * @returns {Promise<object>}
	 */
	async tabsFind(query)
	{
		return chrome.tabs.query(query);
	}
}