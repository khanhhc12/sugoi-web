'use strict';

class UI
{
	/**
	 *
	 * @type {Proxy}
	 */
	proxy = null;

	/**
	 *
	 * @type {Promise<void>}
	 * @private
	 */
	_translation = null;

	/**
	 * @type {TranslatorSugoi}
	 * @private
	 */
	_sugoi;

	/**
	 * @type {TranslatorDeepL}
	 * @private
	 */
	_deepl;

	/**
	 *
	 * @type {Translator}
	 */
	get translator()
	{
		return this.config.mode === Config.MODE_SUGOI
			? this._sugoi
			: this._deepl;
	}

	/**
	 * 
	 * @param {string} domain 
	 */
	constructor(domain)
	{
		this.domain = domain;
		this._config = new Config();

		/**
		 * 
		 * @type {HTMLDivElement}
		 */
		this._uiBlock = null;

		/**
		 *
		 * @type {HTMLButtonElement}
		 */
		this._buttonTranslate = null;

		this.chromeApi = new ChromeApi();

		this._sugoi = new TranslatorSugoi();
		this._sugoi.onProgress((translated, total) => this._updateProgress(translated, total));

		this._deepl = new TranslatorDeepL(this.chromeApi);
		this._deepl.onProgress((translated, total) => this._updateProgress(translated, total));

		this.chromeApi.onStorageChanged(changes => this.config = changes['config'].newValue);
		this.load();

		chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
			this._processMessage(request, sender).then(sendResponse);
			return true;
		});
	}

	/**
	 *
	 * @param {any} request
	 * @param {MessageSender} sender
	 */
	async _processMessage(request, sender)
	{
		if (sender.tab)
		{
			return;
		}

		let response;
		switch (request.action)
		{
			case 'canTranslate':
				response = this.proxy.allowed;
				break;
			case 'translate':
				if (this.proxy.allowed)
				{
					if (this._translation != null)
					{
						await this._translation;
					}
					else
					{
						await this.translate();
					}

					response = true;
				}
				else
				{
					response = false;
				}
				break;
			default:
				response = null;
				break;
		}

		return response;
	}

	get config()
	{
		return this._config;
	}

	/**
	 *
	 * @param {Config} config
	 */
	set config(config)
	{
		this._config = config;
		this._sugoi.setConfig(config);
		this._deepl.setConfig(config);

		this.updateView();
	}

	async load()
	{
		this.config = (await this.chromeApi.getConfig()) ?? new Config();
	}

	async updateView()
	{
		if (this._uiBlock == null)
		{
			return;
		}

		if (this.config.enabled)
		{
			if (this._uiBlock.parentElement == null)
			{
				document.body.append(this._uiBlock);
			}

			const response = await this.chromeApi.send({action: 'show'});
			this.processResponse(response);

			this.proxy.fixContent();

			if (this.config.alwaysTranslate)
			{
				this.translate();
			}
		}
		else
		{
			if (this._uiBlock.parentElement !== null)
			{
				document.body.removeChild(this._uiBlock);
			}

			const response = await this.chromeApi.send({action: 'hide'});
			this.processResponse(response);
		}
	}

	async translate()
	{
		this._buttonTranslate.style.display = 'none';

		const enabled = await this.translator.serverAvailable();
		if (!enabled)
		{
			alert('Sugoi Offline Translation Server is not available.\nProbably server not started or access blocked by AdBlock, Brave Shields, or other similar extensions.');
			this._buttonTranslate.style.display = 'block';
			return;
		}

		this.proxy.loadLines();
		this._translation = this.translator.run(this.proxy.lines);
		await this._translation;
		this.proxy.validate();
		this._translation = null;

		// fix to prevent strange bug: lines translated, but other extensions get original version
		// delay 500ms to prevent it
		await Utilities.wait(500);
	}

	/**
	 *
	 * @param {Number} translated
	 * @param {Number} total
	 * @private
	 */
	_updateProgress(translated, total)
	{
		$(this._uiProgress).css({
			display: 'block',
		}).html(translated + ' / ' + total);
	}

	createButtons()
	{
		this.proxy = Proxy.get(this.domain);
		const enabled = (this.proxy != null) && this.proxy.allowed;
		if (!enabled)
		{
			return;
		}

		this._uiBlock = document.createElement('div');
		$(this._uiBlock).css({
			'width': '100px',
			'display': 'flex',
			'flex-direction': 'column',
			'position': 'fixed',
			'bottom': '10px',
			'right': '10px',
			'z-index': '100000',
		});

		this._uiProgress = document.createElement('div');
		$(this._uiProgress).css({
			'width': '100px',
			'border': '1px solid black',
			'padding': '5px',
			'font-weight': 'bold',
			'background-color': 'white',
			'text-align': 'center',
			'display': 'none',
		});
		this._uiBlock.append(this._uiProgress);

		this._buttonTranslate = document.createElement('button');
		this._uiBlock.append(this._buttonTranslate);

		const $btn_translate = $(this._buttonTranslate).css({
			'width': '100%',
			'height': '25px',
			'font-weight': 'bold',
			'color': 'black',

			'border': '1px solid black',
			'background-color': 'white',
			'cursor': 'pointer',
		}).html('TRANSLATE');

		$btn_translate.on('click', () => this.translate());
	}

	processResponse(response)
	{
		console.log(response);
	}
}