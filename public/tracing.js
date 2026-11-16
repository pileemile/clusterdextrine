(() => {
  // node_modules/@opentelemetry/api/dist/version.mjs
  var VERSION = "1.10.0";

  // node_modules/@opentelemetry/api/dist/internal/semver.mjs
  var re = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;
  function _makeCompatibilityCheck(ownVersion) {
    const acceptedVersions = /* @__PURE__ */ new Set([ownVersion]);
    const rejectedVersions = /* @__PURE__ */ new Set();
    const myVersionMatch = ownVersion.match(re);
    if (!myVersionMatch) return () => false;
    const ownVersionParsed = {
      major: +myVersionMatch[1],
      minor: +myVersionMatch[2],
      patch: +myVersionMatch[3],
      prerelease: myVersionMatch[4]
    };
    if (ownVersionParsed.prerelease != null) return function isExactmatch(globalVersion) {
      return globalVersion === ownVersion;
    };
    function _reject(v) {
      rejectedVersions.add(v);
      return false;
    }
    function _accept(v) {
      acceptedVersions.add(v);
      return true;
    }
    return function isCompatible2(globalVersion) {
      if (acceptedVersions.has(globalVersion)) return true;
      if (rejectedVersions.has(globalVersion)) return false;
      const globalVersionMatch = globalVersion.match(re);
      if (!globalVersionMatch) return _reject(globalVersion);
      const globalVersionParsed = {
        major: +globalVersionMatch[1],
        minor: +globalVersionMatch[2],
        patch: +globalVersionMatch[3],
        prerelease: globalVersionMatch[4]
      };
      if (globalVersionParsed.prerelease != null) return _reject(globalVersion);
      if (ownVersionParsed.major !== globalVersionParsed.major) return _reject(globalVersion);
      if (ownVersionParsed.major === 0) {
        if (ownVersionParsed.minor === globalVersionParsed.minor && ownVersionParsed.patch <= globalVersionParsed.patch) return _accept(globalVersion);
        return _reject(globalVersion);
      }
      if (ownVersionParsed.minor <= globalVersionParsed.minor) return _accept(globalVersion);
      return _reject(globalVersion);
    };
  }
  var isCompatible = _makeCompatibilityCheck(VERSION);

  // node_modules/@opentelemetry/api/dist/internal/global-utils.mjs
  var major = VERSION.split(".")[0];
  var GLOBAL_OPENTELEMETRY_API_KEY = /* @__PURE__ */ Symbol.for(`opentelemetry.js.api.${major}`);
  var _global = typeof globalThis === "object" ? globalThis : typeof self === "object" ? self : typeof window === "object" ? window : typeof global === "object" ? global : {};
  function _makeGlobalApi() {
    return Object.defineProperty({}, "version", {
      value: VERSION,
      enumerable: true,
      writable: false,
      configurable: false
    });
  }
  function registerGlobal(type, instance, diag3, allowOverride = false) {
    var _global$GLOBAL_OPENTE;
    const api = _global[GLOBAL_OPENTELEMETRY_API_KEY] = (_global$GLOBAL_OPENTE = _global[GLOBAL_OPENTELEMETRY_API_KEY]) !== null && _global$GLOBAL_OPENTE !== void 0 ? _global$GLOBAL_OPENTE : _makeGlobalApi();
    if (!allowOverride && api[type]) {
      const err = /* @__PURE__ */ new Error(`@opentelemetry/api: Attempted duplicate registration of API: ${type}`);
      diag3.error(err.stack || err.message);
      return false;
    }
    if (api.version !== "1.10.0") {
      const err = /* @__PURE__ */ new Error(`@opentelemetry/api: Registration of version v${api.version} for ${type} does not match previously registered API v${VERSION}`);
      diag3.error(err.stack || err.message);
      return false;
    }
    api[type] = instance;
    diag3.debug(`@opentelemetry/api: Registered a global for ${type} v${VERSION}.`);
    return true;
  }
  var _compatibleGlobalApi;
  function getGlobal(type) {
    const api = _global[GLOBAL_OPENTELEMETRY_API_KEY];
    if (api == null) return;
    if (api !== _compatibleGlobalApi) {
      if (!api.version || !isCompatible(api.version)) return;
      _compatibleGlobalApi = api;
    }
    return api[type];
  }
  function unregisterGlobal(type, diag3) {
    diag3.debug(`@opentelemetry/api: Unregistering a global for ${type} v${VERSION}.`);
    const api = _global[GLOBAL_OPENTELEMETRY_API_KEY];
    if (api) delete api[type];
  }

  // node_modules/@opentelemetry/api/dist/diag/ComponentLogger.mjs
  var DiagComponentLogger = class {
    constructor(props) {
      this._namespace = props.namespace || "DiagComponentLogger";
    }
    debug(...args) {
      return logProxy("debug", this._namespace, args);
    }
    error(...args) {
      return logProxy("error", this._namespace, args);
    }
    info(...args) {
      return logProxy("info", this._namespace, args);
    }
    warn(...args) {
      return logProxy("warn", this._namespace, args);
    }
    verbose(...args) {
      return logProxy("verbose", this._namespace, args);
    }
  };
  function logProxy(funcName, namespace, args) {
    const logger2 = getGlobal("diag");
    if (!logger2) return;
    return logger2[funcName](namespace, ...args);
  }

  // node_modules/@opentelemetry/api/dist/diag/internal/logLevelLogger.mjs
  function createLogLevelDiagLogger(maxLevel, logger2) {
    if (maxLevel < 0) maxLevel = 0;
    else if (maxLevel > 9999) maxLevel = 9999;
    logger2 = logger2 || {};
    function _filterFunc(funcName, theLevel) {
      const theFunc = logger2[funcName];
      if (typeof theFunc === "function" && maxLevel >= theLevel) return theFunc.bind(logger2);
      return function() {
      };
    }
    return {
      error: _filterFunc("error", 30),
      warn: _filterFunc("warn", 50),
      info: _filterFunc("info", 60),
      debug: _filterFunc("debug", 70),
      verbose: _filterFunc("verbose", 80)
    };
  }

  // node_modules/@opentelemetry/api/dist/api/diag.mjs
  var API_NAME = "diag";
  var DiagAPI = class DiagAPI2 {
    /** Get the singleton instance of the DiagAPI API */
    static instance() {
      if (!this._instance) this._instance = new DiagAPI2();
      return this._instance;
    }
    /**
    * Private internal constructor
    * @private
    */
    constructor() {
      function _logProxy(funcName) {
        return function(...args) {
          const logger2 = getGlobal("diag");
          if (!logger2) return;
          return logger2[funcName](...args);
        };
      }
      const self2 = this;
      const setLogger = (logger2, optionsOrLogLevel = { logLevel: 60 }) => {
        var _optionsOrLogLevel$lo;
        if (logger2 === self2) {
          var _err$stack;
          const err = /* @__PURE__ */ new Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
          self2.error((_err$stack = err.stack) !== null && _err$stack !== void 0 ? _err$stack : err.message);
          return false;
        }
        if (typeof optionsOrLogLevel === "number") optionsOrLogLevel = { logLevel: optionsOrLogLevel };
        const oldLogger = getGlobal("diag");
        const newLogger = createLogLevelDiagLogger((_optionsOrLogLevel$lo = optionsOrLogLevel.logLevel) !== null && _optionsOrLogLevel$lo !== void 0 ? _optionsOrLogLevel$lo : 60, logger2);
        if (oldLogger && !optionsOrLogLevel.suppressOverrideMessage) {
          var _Error$stack;
          const stack = (_Error$stack = (/* @__PURE__ */ new Error()).stack) !== null && _Error$stack !== void 0 ? _Error$stack : "<failed to generate stacktrace>";
          oldLogger.warn(`Current logger will be overwritten from ${stack}`);
          newLogger.warn(`Current logger will overwrite one already registered from ${stack}`);
        }
        return registerGlobal("diag", newLogger, self2, true);
      };
      self2.setLogger = setLogger;
      self2.disable = () => {
        unregisterGlobal(API_NAME, self2);
      };
      self2.createComponentLogger = (options) => {
        return new DiagComponentLogger(options);
      };
      self2.verbose = _logProxy("verbose");
      self2.debug = _logProxy("debug");
      self2.info = _logProxy("info");
      self2.warn = _logProxy("warn");
      self2.error = _logProxy("error");
    }
  };

  // node_modules/@opentelemetry/api/dist/baggage/internal/baggage-impl.mjs
  var BaggageImpl = class BaggageImpl2 {
    constructor(entries) {
      this._entries = entries ? new Map(entries) : /* @__PURE__ */ new Map();
    }
    getEntry(key) {
      const entry = this._entries.get(key);
      if (!entry) return;
      return Object.assign({}, entry);
    }
    getAllEntries() {
      return Array.from(this._entries.entries());
    }
    setEntry(key, entry) {
      const newBaggage = new BaggageImpl2(this._entries);
      newBaggage._entries.set(key, entry);
      return newBaggage;
    }
    removeEntry(key) {
      const newBaggage = new BaggageImpl2(this._entries);
      newBaggage._entries.delete(key);
      return newBaggage;
    }
    removeEntries(...keys) {
      const newBaggage = new BaggageImpl2(this._entries);
      for (const key of keys) newBaggage._entries.delete(key);
      return newBaggage;
    }
    clear() {
      return new BaggageImpl2();
    }
  };

  // node_modules/@opentelemetry/api/dist/baggage/utils.mjs
  var diag = DiagAPI.instance();
  function createBaggage(entries = {}) {
    return new BaggageImpl(new Map(Object.entries(entries)));
  }

  // node_modules/@opentelemetry/api/dist/context/context.mjs
  function createContextKey(description) {
    return Symbol.for(description);
  }
  var ROOT_CONTEXT = new class BaseContext {
    /**
    * Construct a new context which inherits values from an optional parent context.
    *
    * @param parentContext a context from which to inherit values
    */
    constructor(parentContext) {
      const self2 = this;
      self2._currentContext = parentContext ? new Map(parentContext) : /* @__PURE__ */ new Map();
      self2.getValue = (key) => self2._currentContext.get(key);
      self2.setValue = (key, value) => {
        const context2 = new BaseContext(self2._currentContext);
        context2._currentContext.set(key, value);
        return context2;
      };
      self2.deleteValue = (key) => {
        const context2 = new BaseContext(self2._currentContext);
        context2._currentContext.delete(key);
        return context2;
      };
    }
  }();

  // node_modules/@opentelemetry/api/dist/metrics/NoopMeter.mjs
  var NoopMeter = class {
    constructor() {
    }
    /**
    * @see {@link Meter.createGauge}
    */
    createGauge(_name, _options) {
      return NOOP_GAUGE_METRIC;
    }
    /**
    * @see {@link Meter.createHistogram}
    */
    createHistogram(_name, _options) {
      return NOOP_HISTOGRAM_METRIC;
    }
    /**
    * @see {@link Meter.createCounter}
    */
    createCounter(_name, _options) {
      return NOOP_COUNTER_METRIC;
    }
    /**
    * @see {@link Meter.createUpDownCounter}
    */
    createUpDownCounter(_name, _options) {
      return NOOP_UP_DOWN_COUNTER_METRIC;
    }
    /**
    * @see {@link Meter.createObservableGauge}
    */
    createObservableGauge(_name, _options) {
      return NOOP_OBSERVABLE_GAUGE_METRIC;
    }
    /**
    * @see {@link Meter.createObservableCounter}
    */
    createObservableCounter(_name, _options) {
      return NOOP_OBSERVABLE_COUNTER_METRIC;
    }
    /**
    * @see {@link Meter.createObservableUpDownCounter}
    */
    createObservableUpDownCounter(_name, _options) {
      return NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC;
    }
    /**
    * @see {@link Meter.addBatchObservableCallback}
    */
    addBatchObservableCallback(_callback, _observables) {
    }
    /**
    * @see {@link Meter.removeBatchObservableCallback}
    */
    removeBatchObservableCallback(_callback) {
    }
  };
  var NoopMetric = class {
  };
  var NoopCounterMetric = class extends NoopMetric {
    add(_value, _attributes) {
    }
  };
  var NoopUpDownCounterMetric = class extends NoopMetric {
    add(_value, _attributes) {
    }
  };
  var NoopGaugeMetric = class extends NoopMetric {
    record(_value, _attributes) {
    }
  };
  var NoopHistogramMetric = class extends NoopMetric {
    record(_value, _attributes) {
    }
  };
  var NoopObservableMetric = class {
    addCallback(_callback) {
    }
    removeCallback(_callback) {
    }
  };
  var NoopObservableCounterMetric = class extends NoopObservableMetric {
  };
  var NoopObservableGaugeMetric = class extends NoopObservableMetric {
  };
  var NoopObservableUpDownCounterMetric = class extends NoopObservableMetric {
  };
  var NOOP_METER = new NoopMeter();
  var NOOP_COUNTER_METRIC = new NoopCounterMetric();
  var NOOP_GAUGE_METRIC = new NoopGaugeMetric();
  var NOOP_HISTOGRAM_METRIC = new NoopHistogramMetric();
  var NOOP_UP_DOWN_COUNTER_METRIC = new NoopUpDownCounterMetric();
  var NOOP_OBSERVABLE_COUNTER_METRIC = new NoopObservableCounterMetric();
  var NOOP_OBSERVABLE_GAUGE_METRIC = new NoopObservableGaugeMetric();
  var NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC = new NoopObservableUpDownCounterMetric();
  function createNoopMeter() {
    return NOOP_METER;
  }

  // node_modules/@opentelemetry/api/dist/logs/NoopLogger.mjs
  var NoopLogger = class {
    emit(_logRecord) {
    }
    enabled() {
      return false;
    }
  };
  var NOOP_LOGGER = new NoopLogger();

  // node_modules/@opentelemetry/api/dist/propagation/TextMapPropagator.mjs
  var defaultTextMapGetter = {
    get(carrier, key) {
      if (carrier == null) return;
      return carrier[key];
    },
    keys(carrier) {
      if (carrier == null) return [];
      return Object.keys(carrier);
    }
  };
  var defaultTextMapSetter = { set(carrier, key, value) {
    if (carrier == null) return;
    carrier[key] = value;
  } };

  // node_modules/@opentelemetry/api/dist/trace/trace_flags.mjs
  var TraceFlags = /* @__PURE__ */ (function(TraceFlags2) {
    TraceFlags2[TraceFlags2["NONE"] = 0] = "NONE";
    TraceFlags2[TraceFlags2["SAMPLED"] = 1] = "SAMPLED";
    return TraceFlags2;
  })({});

  // node_modules/@opentelemetry/api/dist/trace/invalid-span-constants.mjs
  var INVALID_SPANID = "0000000000000000";
  var INVALID_TRACEID = "00000000000000000000000000000000";
  var INVALID_SPAN_CONTEXT = {
    traceId: INVALID_TRACEID,
    spanId: INVALID_SPANID,
    traceFlags: 0
  };

  // node_modules/@opentelemetry/api/dist/trace/NonRecordingSpan.mjs
  var NonRecordingSpan = class {
    constructor(spanContext = INVALID_SPAN_CONTEXT) {
      this._spanContext = spanContext;
    }
    spanContext() {
      return this._spanContext;
    }
    setAttribute(_key, _value) {
      return this;
    }
    setAttributes(_attributes) {
      return this;
    }
    addEvent(_name, _attributes) {
      return this;
    }
    addLink(_link) {
      return this;
    }
    addLinks(_links) {
      return this;
    }
    setStatus(_status) {
      return this;
    }
    updateName(_name) {
      return this;
    }
    end(_endTime) {
    }
    isRecording() {
      return false;
    }
    recordException(_exception, _time) {
    }
  };

  // node_modules/@opentelemetry/api/dist/trace/spancontext-utils.mjs
  var isHex = new Uint8Array([
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1
  ]);
  function isValidHex(id, length) {
    if (typeof id !== "string" || id.length !== length) return false;
    let r = 0;
    for (let i = 0; i < id.length; i += 4) r += (isHex[id.charCodeAt(i)] | 0) + (isHex[id.charCodeAt(i + 1)] | 0) + (isHex[id.charCodeAt(i + 2)] | 0) + (isHex[id.charCodeAt(i + 3)] | 0);
    return r === length;
  }
  function isValidTraceId(traceId) {
    return isValidHex(traceId, 32) && traceId !== "00000000000000000000000000000000";
  }
  function isValidSpanId(spanId) {
    return isValidHex(spanId, 16) && spanId !== "0000000000000000";
  }
  function isSpanContextValid(spanContext) {
    return isValidTraceId(spanContext.traceId) && isValidSpanId(spanContext.spanId);
  }
  function wrapSpanContext(spanContext) {
    return new NonRecordingSpan(spanContext);
  }

  // node_modules/@opentelemetry/api/dist/context/NoopContextManager.mjs
  var NoopContextManager = class {
    active() {
      return ROOT_CONTEXT;
    }
    with(_context, fn, thisArg, ...args) {
      return fn.call(thisArg, ...args);
    }
    bind(_context, target) {
      return target;
    }
    enable() {
      return this;
    }
    disable() {
      return this;
    }
    /** @experimental This API is experimental and may change in minor releases without prior notice. */
    attach(_context) {
      return { dispose() {
      } };
    }
  };

  // node_modules/@opentelemetry/api/dist/api/context.mjs
  var API_NAME2 = "context";
  var NOOP_CONTEXT_MANAGER = new NoopContextManager();
  var NOOP_TOKEN = Object.freeze({ dispose: () => {
  } });
  var ContextAPI = class ContextAPI2 {
    /** Empty private constructor prevents end users from constructing a new instance of the API */
    constructor() {
      this._attachUnsupportedWarned = false;
    }
    /** Get the singleton instance of the Context API */
    static getInstance() {
      if (!this._instance) this._instance = new ContextAPI2();
      return this._instance;
    }
    /**
    * Set the current context manager.
    *
    * @returns true if the context manager was successfully registered, else false
    */
    setGlobalContextManager(contextManager) {
      return registerGlobal(API_NAME2, contextManager, DiagAPI.instance());
    }
    /**
    * Get the currently active context
    */
    active() {
      return this._getContextManager().active();
    }
    /**
    * Execute a function with an active context
    *
    * @param context context to be active during function execution
    * @param fn function to execute in a context
    * @param thisArg optional receiver to be used for calling fn
    * @param args optional arguments forwarded to fn
    */
    with(context2, fn, thisArg, ...args) {
      return this._getContextManager().with(context2, fn, thisArg, ...args);
    }
    /**
    * Bind a context to a target function or event emitter
    *
    * @param context context to bind to the event emitter or function. Defaults to the currently active context
    * @param target function or event emitter to bind
    */
    bind(context2, target) {
      return this._getContextManager().bind(context2, target);
    }
    /**
    * Imperatively sets `context` as active, returning a {@link ContextManagementToken} whose
    * {@link ContextManagementToken.dispose} restores the previous context.
    *
    * This is a delicate, low-level API - prefer {@link with}/{@link bind}, which
    * restore context automatically. Use `attach` only to bridge callback
    * boundaries that `with` cannot wrap. Call `token.dispose()` when the
    * operation is done.
    *
    * **Caveat for async functions:** If called inside an async function before
    * the first `await`, the context change may leak into the caller's context
    * and remain active there. Prefer {@link with} for async code.
    *
    * Support is best-effort and varies by the active ContextManager (see
    * {@link ContextManager.attach}); if it does not implement `attach`, this logs
    * a warning and returns a no-op token.
    *
    * @param context The Context to attach
    * @returns A {@link ContextManagementToken} whose dispose() restores the previous Context
    * @since 1.10.0
    * @experimental This API is experimental and may change in minor releases without prior notice.
    */
    attach(context2) {
      const contextManager = this._getContextManager();
      if (contextManager.attach) return contextManager.attach(context2);
      if (!this._attachUnsupportedWarned) {
        this._attachUnsupportedWarned = true;
        DiagAPI.instance().warn("The current ContextManager does not implement attach(). The context will not be attached. Use a ContextManager that supports attach() (e.g. AsyncLocalStorageContextManager) or use with()/bind() instead.");
      }
      return NOOP_TOKEN;
    }
    _getContextManager() {
      return getGlobal(API_NAME2) || NOOP_CONTEXT_MANAGER;
    }
    /** Disable and remove the global context manager */
    disable() {
      this._getContextManager().disable();
      unregisterGlobal(API_NAME2, DiagAPI.instance());
    }
  };

  // node_modules/@opentelemetry/api/dist/trace/context-utils.mjs
  var SPAN_KEY = createContextKey("OpenTelemetry Context Key SPAN");
  function getSpan(context2) {
    return context2.getValue(SPAN_KEY) || void 0;
  }
  function getActiveSpan() {
    return getSpan(ContextAPI.getInstance().active());
  }
  function setSpan(context2, span) {
    return context2.setValue(SPAN_KEY, span);
  }
  function deleteSpan(context2) {
    return context2.deleteValue(SPAN_KEY);
  }
  function setSpanContext(context2, spanContext) {
    return setSpan(context2, new NonRecordingSpan(spanContext));
  }
  function getSpanContext(context2) {
    var _getSpan;
    return (_getSpan = getSpan(context2)) === null || _getSpan === void 0 ? void 0 : _getSpan.spanContext();
  }

  // node_modules/@opentelemetry/api/dist/trace/NoopTracer.mjs
  var contextApi = ContextAPI.getInstance();
  var NoopTracer = class {
    startSpan(name, options, context2 = contextApi.active()) {
      if (Boolean(options === null || options === void 0 ? void 0 : options.root)) return new NonRecordingSpan();
      const parentFromContext = context2 && getSpanContext(context2);
      if (isSpanContext(parentFromContext) && isSpanContextValid(parentFromContext)) return new NonRecordingSpan(parentFromContext);
      else return new NonRecordingSpan();
    }
    startActiveSpan(name, arg2, arg3, arg4) {
      var _ctx;
      let opts;
      let ctx;
      let fn;
      if (arguments.length < 2) return;
      else if (arguments.length === 2) fn = arg2;
      else if (arguments.length === 3) {
        opts = arg2;
        fn = arg3;
      } else {
        opts = arg2;
        ctx = arg3;
        fn = arg4;
      }
      const parentContext = (_ctx = ctx) !== null && _ctx !== void 0 ? _ctx : contextApi.active();
      const span = this.startSpan(name, opts, parentContext);
      const contextWithSpanSet = setSpan(parentContext, span);
      return contextApi.with(contextWithSpanSet, fn, void 0, span);
    }
  };
  function isSpanContext(spanContext) {
    return spanContext !== null && typeof spanContext === "object" && "spanId" in spanContext && typeof spanContext["spanId"] === "string" && "traceId" in spanContext && typeof spanContext["traceId"] === "string" && "traceFlags" in spanContext && typeof spanContext["traceFlags"] === "number";
  }

  // node_modules/@opentelemetry/api/dist/trace/ProxyTracer.mjs
  var NOOP_TRACER = new NoopTracer();
  var ProxyTracer = class {
    constructor(provider, name, version, options) {
      this._provider = provider;
      this.name = name;
      this.version = version;
      this.options = options;
    }
    startSpan(name, options, context2) {
      return this._getTracer().startSpan(name, options, context2);
    }
    startActiveSpan(_name, _options, _context, _fn) {
      const tracer = this._getTracer();
      return Reflect.apply(tracer.startActiveSpan, tracer, arguments);
    }
    /**
    * Try to get a tracer from the proxy tracer provider.
    * If the proxy tracer provider has no delegate, return a noop tracer.
    */
    _getTracer() {
      if (this._delegate) return this._delegate;
      const tracer = this._provider.getDelegateTracer(this.name, this.version, this.options);
      if (!tracer) return NOOP_TRACER;
      this._delegate = tracer;
      return this._delegate;
    }
  };

  // node_modules/@opentelemetry/api/dist/trace/span_kind.mjs
  var SpanKind = /* @__PURE__ */ (function(SpanKind2) {
    SpanKind2[SpanKind2["INTERNAL"] = 0] = "INTERNAL";
    SpanKind2[SpanKind2["SERVER"] = 1] = "SERVER";
    SpanKind2[SpanKind2["CLIENT"] = 2] = "CLIENT";
    SpanKind2[SpanKind2["PRODUCER"] = 3] = "PRODUCER";
    SpanKind2[SpanKind2["CONSUMER"] = 4] = "CONSUMER";
    return SpanKind2;
  })({});

  // node_modules/@opentelemetry/api/dist/trace/status.mjs
  var SpanStatusCode = /* @__PURE__ */ (function(SpanStatusCode2) {
    SpanStatusCode2[SpanStatusCode2["UNSET"] = 0] = "UNSET";
    SpanStatusCode2[SpanStatusCode2["OK"] = 1] = "OK";
    SpanStatusCode2[SpanStatusCode2["ERROR"] = 2] = "ERROR";
    return SpanStatusCode2;
  })({});

  // node_modules/@opentelemetry/api/dist/trace/NoopTracerProvider.mjs
  var NoopTracerProvider = class {
    getTracer(_name, _version, _options) {
      return new NoopTracer();
    }
  };

  // node_modules/@opentelemetry/api/dist/trace/ProxyTracerProvider.mjs
  var NOOP_TRACER_PROVIDER = new NoopTracerProvider();
  var ProxyTracerProvider = class {
    /**
    * Get a {@link ProxyTracer}
    */
    getTracer(name, version, options) {
      var _this$getDelegateTrac;
      return (_this$getDelegateTrac = this.getDelegateTracer(name, version, options)) !== null && _this$getDelegateTrac !== void 0 ? _this$getDelegateTrac : new ProxyTracer(this, name, version, options);
    }
    getDelegate() {
      var _this$_delegate;
      return (_this$_delegate = this._delegate) !== null && _this$_delegate !== void 0 ? _this$_delegate : NOOP_TRACER_PROVIDER;
    }
    /**
    * Set the delegate tracer provider
    */
    setDelegate(delegate) {
      this._delegate = delegate;
    }
    getDelegateTracer(name, version, options) {
      var _this$_delegate2;
      return (_this$_delegate2 = this._delegate) === null || _this$_delegate2 === void 0 ? void 0 : _this$_delegate2.getTracer(name, version, options);
    }
  };

  // node_modules/@opentelemetry/api/dist/trace/SamplingResult.mjs
  var SamplingDecision = /* @__PURE__ */ (function(SamplingDecision2) {
    SamplingDecision2[SamplingDecision2["NOT_RECORD"] = 0] = "NOT_RECORD";
    SamplingDecision2[SamplingDecision2["RECORD"] = 1] = "RECORD";
    SamplingDecision2[SamplingDecision2["RECORD_AND_SAMPLED"] = 2] = "RECORD_AND_SAMPLED";
    return SamplingDecision2;
  })({});

  // node_modules/@opentelemetry/api/dist/context-api.mjs
  var context = ContextAPI.getInstance();

  // node_modules/@opentelemetry/api/dist/diag-api.mjs
  var diag2 = DiagAPI.instance();

  // node_modules/@opentelemetry/api/dist/logs/NoopLoggerProvider.mjs
  var NoopLoggerProvider = class {
    getLogger(_name, _version, _options) {
      return new NoopLogger();
    }
  };
  var NOOP_LOGGER_PROVIDER = new NoopLoggerProvider();

  // node_modules/@opentelemetry/api/dist/logs/ProxyLogger.mjs
  var ProxyLogger = class {
    constructor(provider, name, version, options) {
      this._provider = provider;
      this.name = name;
      this.version = version;
      this.options = options;
    }
    /**
    * Emit a log record. This method should only be used by log appenders.
    *
    * @param logRecord
    */
    emit(logRecord) {
      this._getLogger().emit(logRecord);
    }
    enabled(options) {
      return this._getLogger().enabled(options);
    }
    /**
    * Try to get a logger from the proxy logger provider.
    * If the proxy logger provider has no delegate, return a noop logger.
    */
    _getLogger() {
      if (this._delegate) return this._delegate;
      const logger2 = this._provider._getDelegateLogger(this.name, this.version, this.options);
      if (!logger2) return NOOP_LOGGER;
      this._delegate = logger2;
      return this._delegate;
    }
  };

  // node_modules/@opentelemetry/api/dist/logs/ProxyLoggerProvider.mjs
  var ProxyLoggerProvider = class {
    getLogger(name, version, options) {
      var _this$_getDelegateLog;
      return (_this$_getDelegateLog = this._getDelegateLogger(name, version, options)) !== null && _this$_getDelegateLog !== void 0 ? _this$_getDelegateLog : new ProxyLogger(this, name, version, options);
    }
    /**
    * Get the delegate logger provider.
    * Used by tests only.
    * @internal
    */
    _getDelegate() {
      var _this$_delegate;
      return (_this$_delegate = this._delegate) !== null && _this$_delegate !== void 0 ? _this$_delegate : NOOP_LOGGER_PROVIDER;
    }
    /**
    * Set the delegate logger provider
    * @internal
    */
    _setDelegate(delegate) {
      this._delegate = delegate;
    }
    /**
    * @internal
    */
    _getDelegateLogger(name, version, options) {
      var _this$_delegate2;
      return (_this$_delegate2 = this._delegate) === null || _this$_delegate2 === void 0 ? void 0 : _this$_delegate2.getLogger(name, version, options);
    }
  };

  // node_modules/@opentelemetry/api/dist/api/logs.mjs
  var API_NAME3 = "logs";
  var LogsAPI = class LogsAPI2 {
    /** Empty private constructor prevents end users from constructing a new instance of the API */
    constructor() {
      this._proxyLoggerProvider = new ProxyLoggerProvider();
    }
    /** Get the singleton instance of the Logs API */
    static getInstance() {
      if (!this._instance) this._instance = new LogsAPI2();
      return this._instance;
    }
    setGlobalLoggerProvider(provider) {
      const success = registerGlobal(API_NAME3, provider, DiagAPI.instance());
      if (success) this._proxyLoggerProvider._setDelegate(provider);
      return success;
    }
    /**
    * Returns the global logger provider.
    *
    * @returns LoggerProvider
    */
    getLoggerProvider() {
      return getGlobal(API_NAME3) || this._proxyLoggerProvider;
    }
    /**
    * Returns a Logger, creating one if one with the given name, version,
    * schemaUrl, and attributes is not already created.
    *
    * Getting a Logger may be expensive, especially when `attributes` are
    * provided. Reuse Logger instances where possible instead of calling
    * `getLogger()` on hot paths.
    *
    * @param name The name of the logger or instrumentation library.
    * @param version The version of the logger or instrumentation library.
    * @param options The options of the logger or instrumentation library.
    * @returns {@link Logger}
    */
    getLogger(name, version, options) {
      return this.getLoggerProvider().getLogger(name, version, options);
    }
    /** Remove the global logger provider */
    disable() {
      unregisterGlobal(API_NAME3, DiagAPI.instance());
      this._proxyLoggerProvider = new ProxyLoggerProvider();
    }
  };

  // node_modules/@opentelemetry/api/dist/logs-api.mjs
  var logs = LogsAPI.getInstance();

  // node_modules/@opentelemetry/api/dist/metrics/NoopMeterProvider.mjs
  var NoopMeterProvider = class {
    getMeter(_name, _version, _options) {
      return NOOP_METER;
    }
  };
  var NOOP_METER_PROVIDER = new NoopMeterProvider();

  // node_modules/@opentelemetry/api/dist/api/metrics.mjs
  var API_NAME4 = "metrics";
  var MetricsAPI = class MetricsAPI2 {
    /** Empty private constructor prevents end users from constructing a new instance of the API */
    constructor() {
    }
    /** Get the singleton instance of the Metrics API */
    static getInstance() {
      if (!this._instance) this._instance = new MetricsAPI2();
      return this._instance;
    }
    /**
    * Set the current global meter provider.
    * Returns true if the meter provider was successfully registered, else false.
    */
    setGlobalMeterProvider(provider) {
      return registerGlobal(API_NAME4, provider, DiagAPI.instance());
    }
    /**
    * Returns the global meter provider.
    */
    getMeterProvider() {
      return getGlobal(API_NAME4) || NOOP_METER_PROVIDER;
    }
    /**
    * Returns a meter from the global meter provider.
    */
    getMeter(name, version, options) {
      return this.getMeterProvider().getMeter(name, version, options);
    }
    /** Remove the global meter provider */
    disable() {
      unregisterGlobal(API_NAME4, DiagAPI.instance());
    }
  };

  // node_modules/@opentelemetry/api/dist/metrics-api.mjs
  var metrics = MetricsAPI.getInstance();

  // node_modules/@opentelemetry/api/dist/propagation/NoopTextMapPropagator.mjs
  var NoopTextMapPropagator = class {
    /** Noop inject function does nothing */
    inject(_context, _carrier) {
    }
    /** Noop extract function does nothing and returns the input context */
    extract(context2, _carrier) {
      return context2;
    }
    fields() {
      return [];
    }
  };

  // node_modules/@opentelemetry/api/dist/baggage/context-helpers.mjs
  var BAGGAGE_KEY = createContextKey("OpenTelemetry Baggage Key");
  function getBaggage(context2) {
    return context2.getValue(BAGGAGE_KEY) || void 0;
  }
  function getActiveBaggage() {
    return getBaggage(ContextAPI.getInstance().active());
  }
  function setBaggage(context2, baggage) {
    return context2.setValue(BAGGAGE_KEY, baggage);
  }
  function deleteBaggage(context2) {
    return context2.deleteValue(BAGGAGE_KEY);
  }

  // node_modules/@opentelemetry/api/dist/api/propagation.mjs
  var API_NAME5 = "propagation";
  var NOOP_TEXT_MAP_PROPAGATOR = new NoopTextMapPropagator();
  var PropagationAPI = class PropagationAPI2 {
    /** Empty private constructor prevents end users from constructing a new instance of the API */
    constructor() {
      this.createBaggage = createBaggage;
      this.getBaggage = getBaggage;
      this.getActiveBaggage = getActiveBaggage;
      this.setBaggage = setBaggage;
      this.deleteBaggage = deleteBaggage;
    }
    /** Get the singleton instance of the Propagator API */
    static getInstance() {
      if (!this._instance) this._instance = new PropagationAPI2();
      return this._instance;
    }
    /**
    * Set the current propagator.
    *
    * @returns true if the propagator was successfully registered, else false
    */
    setGlobalPropagator(propagator) {
      return registerGlobal(API_NAME5, propagator, DiagAPI.instance());
    }
    /**
    * Inject context into a carrier to be propagated inter-process
    *
    * @param context Context carrying tracing data to inject
    * @param carrier carrier to inject context into
    * @param setter Function used to set values on the carrier
    */
    inject(context2, carrier, setter = defaultTextMapSetter) {
      return this._getGlobalPropagator().inject(context2, carrier, setter);
    }
    /**
    * Extract context from a carrier
    *
    * @param context Context which the newly created context will inherit from
    * @param carrier Carrier to extract context from
    * @param getter Function used to extract keys from a carrier
    */
    extract(context2, carrier, getter = defaultTextMapGetter) {
      return this._getGlobalPropagator().extract(context2, carrier, getter);
    }
    /**
    * Return a list of all fields which may be used by the propagator.
    */
    fields() {
      return this._getGlobalPropagator().fields();
    }
    /** Remove the global propagator */
    disable() {
      unregisterGlobal(API_NAME5, DiagAPI.instance());
    }
    _getGlobalPropagator() {
      return getGlobal(API_NAME5) || NOOP_TEXT_MAP_PROPAGATOR;
    }
  };

  // node_modules/@opentelemetry/api/dist/propagation-api.mjs
  var propagation = PropagationAPI.getInstance();

  // node_modules/@opentelemetry/api/dist/api/trace.mjs
  var API_NAME6 = "trace";
  var TraceAPI = class TraceAPI2 {
    /** Empty private constructor prevents end users from constructing a new instance of the API */
    constructor() {
      this._proxyTracerProvider = new ProxyTracerProvider();
      this.wrapSpanContext = wrapSpanContext;
      this.isSpanContextValid = isSpanContextValid;
      this.deleteSpan = deleteSpan;
      this.getSpan = getSpan;
      this.getActiveSpan = getActiveSpan;
      this.getSpanContext = getSpanContext;
      this.setSpan = setSpan;
      this.setSpanContext = setSpanContext;
    }
    /** Get the singleton instance of the Trace API */
    static getInstance() {
      if (!this._instance) this._instance = new TraceAPI2();
      return this._instance;
    }
    /**
    * Set the current global tracer.
    *
    * @returns true if the tracer provider was successfully registered, else false
    */
    setGlobalTracerProvider(provider) {
      const success = registerGlobal(API_NAME6, this._proxyTracerProvider, DiagAPI.instance());
      if (success) this._proxyTracerProvider.setDelegate(provider);
      return success;
    }
    /**
    * Returns the global tracer provider.
    */
    getTracerProvider() {
      return getGlobal(API_NAME6) || this._proxyTracerProvider;
    }
    /**
    * Returns a tracer from the global tracer provider.
    */
    getTracer(name, version) {
      return this.getTracerProvider().getTracer(name, version);
    }
    /** Remove the global tracer provider */
    disable() {
      unregisterGlobal(API_NAME6, DiagAPI.instance());
      this._proxyTracerProvider = new ProxyTracerProvider();
    }
  };

  // node_modules/@opentelemetry/api/dist/trace-api.mjs
  var trace = TraceAPI.getInstance();

  // node_modules/@opentelemetry/core/dist/trace/suppress-tracing.mjs
  var SUPPRESS_TRACING_KEY = createContextKey("OpenTelemetry SDK Context Key SUPPRESS_TRACING");
  function suppressTracing(context2) {
    return context2.setValue(SUPPRESS_TRACING_KEY, true);
  }
  function isTracingSuppressed(context2) {
    return context2.getValue(SUPPRESS_TRACING_KEY) === true;
  }

  // node_modules/@opentelemetry/core/dist/common/attributes.mjs
  var AddAttributeDecision = /* @__PURE__ */ (function(AddAttributeDecision2) {
    AddAttributeDecision2[AddAttributeDecision2["DROP_UNDEFINED"] = 0] = "DROP_UNDEFINED";
    AddAttributeDecision2[AddAttributeDecision2["DROP_INVALID"] = 1] = "DROP_INVALID";
    AddAttributeDecision2[AddAttributeDecision2["DROP_LIMIT_REACHED"] = 2] = "DROP_LIMIT_REACHED";
    AddAttributeDecision2[AddAttributeDecision2["ADD_NEW"] = 3] = "ADD_NEW";
    AddAttributeDecision2[AddAttributeDecision2["ADD_OVERWRITE_EXISTING"] = 4] = "ADD_OVERWRITE_EXISTING";
    return AddAttributeDecision2;
  })({});
  function maybeAddAttribute(opts) {
    return maybeAddAttributeInternal(opts, isAnyValue);
  }
  function maybeAddAttributeInternal(opts, isValidValue) {
    if (opts.value === void 0) return 0;
    if (opts.key.length === 0) {
      diag2.warn(`Invalid attribute key: ${opts.key}`);
      return 1;
    }
    const isNewKey = !Object.hasOwn(opts.attributes, opts.key);
    if (isNewKey && opts.currentAttributesCount >= opts.limits.attributeCountLimit) return 2;
    if (!isValidValue(opts.value)) {
      diag2.warn(`Invalid attribute value set for key: ${opts.key}`);
      return 1;
    }
    let attributeValueLengthLimit = opts.limits.attributeValueLengthLimit;
    if (attributeValueLengthLimit <= 0) {
      diag2.warn(`Invalid attributeValueLengthLimit: must be positive, got ${attributeValueLengthLimit} (ignoring)`);
      attributeValueLengthLimit = Infinity;
    }
    opts.attributes[opts.key] = copyAndTruncAnyValue(opts.value, attributeValueLengthLimit);
    if (isNewKey) return 3;
    return 4;
  }
  function cleanAttributes(inAttributes, limits) {
    return cleanAttributesInternal(inAttributes, limits, isAnyValue);
  }
  function cleanSimpleAttributes(inAttributes, limits) {
    return cleanAttributesInternal(inAttributes, limits, isSimpleAttributeValue);
  }
  function cleanAttributesInternal(inAttributes, limits, isValidValue) {
    if (typeof inAttributes !== "object" || inAttributes == null) return {};
    const attributes = {};
    let droppedAttributesCount = 0;
    let attributeValueLengthLimit = limits.attributeValueLengthLimit;
    if (attributeValueLengthLimit <= 0) {
      diag2.warn(`Invalid attributeValueLengthLimit: must be positive, got ${attributeValueLengthLimit} (ignoring)`);
      attributeValueLengthLimit = Infinity;
    }
    let count = 0;
    for (const [key, val] of Object.entries(inAttributes)) {
      if (val === void 0) continue;
      if (count >= limits.attributeCountLimit) {
        droppedAttributesCount++;
        continue;
      }
      if (key.length === 0) {
        diag2.warn(`Invalid attribute key: ${key}`);
        droppedAttributesCount++;
        continue;
      }
      if (!isValidValue(val)) {
        diag2.warn(`Invalid attribute value set for key: ${key}`);
        droppedAttributesCount++;
        continue;
      }
      attributes[key] = copyAndTruncAnyValue(val, attributeValueLengthLimit);
      count++;
    }
    return {
      attributes,
      droppedAttributesCount
    };
  }
  function isAnyValue(val) {
    return isAnyValueInternal(val, /* @__PURE__ */ new WeakSet());
  }
  function isAnyValueInternal(val, visited) {
    switch (typeof val) {
      case "undefined":
      case "bigint":
      case "symbol":
      case "function":
        return false;
      case "string":
      case "number":
      case "boolean":
        return true;
      case "object":
        break;
      default:
        return false;
    }
    if (val === null) return true;
    if (val instanceof Uint8Array) return true;
    if (visited.has(val)) return false;
    visited.add(val);
    const isValid = isAnyValueObject(val, visited);
    visited.delete(val);
    return isValid;
  }
  function isAnyValueObject(val, visited) {
    if (Array.isArray(val)) {
      for (const item of val) if (item !== void 0 && !isAnyValueInternal(item, visited)) return false;
      return true;
    }
    const obj = val;
    if (obj.constructor !== Object && obj.constructor !== void 0) return false;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (v !== void 0 && !isAnyValueInternal(v, visited)) return false;
    }
    return true;
  }
  function copyAndTruncAnyValue(val, limit) {
    switch (typeof val) {
      case "number":
      case "boolean":
      case "undefined":
      case "bigint":
      case "symbol":
      case "function":
        return val;
      case "string":
        if (val.length <= limit) return val;
        else return val.substring(0, limit);
      case "object":
        break;
      default:
        return val;
    }
    if (val === null) return val;
    if (val instanceof Uint8Array) {
      if (val.length <= limit) return val;
      else return val.slice(0, limit);
    }
    if (Array.isArray(val)) return val.map((elem) => copyAndTruncAnyValue(elem, limit));
    const truncObj = {};
    const obj = val;
    for (const k of Object.keys(obj)) if (obj[k] !== void 0) truncObj[k] = copyAndTruncAnyValue(obj[k], limit);
    return truncObj;
  }
  function isSimpleAttributeValue(val) {
    if (Array.isArray(val)) return isHomogeneousAttributeValueArray(val);
    return isValidPrimitiveAttributeValueType(typeof val);
  }
  function isHomogeneousAttributeValueArray(arr) {
    let type;
    for (const element of arr) {
      if (element == null) continue;
      const elementType = typeof element;
      if (elementType === type) continue;
      if (!type) {
        if (isValidPrimitiveAttributeValueType(elementType)) {
          type = elementType;
          continue;
        }
        return false;
      }
      return false;
    }
    return true;
  }
  function isValidPrimitiveAttributeValueType(valType) {
    switch (valType) {
      case "number":
      case "boolean":
      case "string":
        return true;
    }
    return false;
  }

  // node_modules/@opentelemetry/core/dist/common/logging-error-handler.mjs
  function loggingErrorHandler() {
    return (ex) => {
      diag2.error(stringifyException(ex));
    };
  }
  function stringifyException(ex) {
    if (typeof ex === "string") return ex;
    else return JSON.stringify(flattenException(ex));
  }
  function flattenException(ex) {
    const result = {};
    let current = ex;
    while (current !== null) {
      Object.getOwnPropertyNames(current).forEach((propertyName) => {
        if (result[propertyName]) return;
        const value = current[propertyName];
        if (value) result[propertyName] = String(value);
      });
      current = Object.getPrototypeOf(current);
    }
    return result;
  }

  // node_modules/@opentelemetry/core/dist/common/global-error-handler.mjs
  var delegateHandler = loggingErrorHandler();
  function globalErrorHandler(ex) {
    try {
      delegateHandler(ex);
    } catch {
    }
  }

  // node_modules/@opentelemetry/core/dist/common/time.mjs
  var NANOSECOND_DIGITS = 9;
  var MILLISECONDS_TO_NANOSECONDS = Math.pow(10, 6);
  var SECOND_TO_NANOSECONDS = Math.pow(10, NANOSECOND_DIGITS);
  function millisToHrTime(epochMillis) {
    const epochSeconds = epochMillis / 1e3;
    return [Math.trunc(epochSeconds), Math.round(epochMillis % 1e3 * MILLISECONDS_TO_NANOSECONDS)];
  }
  function hrTime(performanceNow) {
    return addHrTimes(millisToHrTime(performance.timeOrigin), millisToHrTime(typeof performanceNow === "number" ? performanceNow : performance.now()));
  }
  function timeInputToHrTime(time) {
    if (isTimeInputHrTime(time)) return time;
    else if (typeof time === "number") {
      if (time < performance.timeOrigin / 2) return hrTime(time);
      else return millisToHrTime(time);
    } else if (time instanceof Date) return millisToHrTime(time.getTime());
    else throw TypeError("Invalid input type");
  }
  function hrTimeDuration(startTime, endTime) {
    let seconds = endTime[0] - startTime[0];
    let nanos = endTime[1] - startTime[1];
    if (nanos < 0) {
      seconds -= 1;
      nanos += SECOND_TO_NANOSECONDS;
    }
    return [seconds, nanos];
  }
  function hrTimeToNanoseconds(time) {
    return time[0] * SECOND_TO_NANOSECONDS + time[1];
  }
  function hrTimeToMilliseconds(time) {
    return time[0] * 1e3 + time[1] / 1e6;
  }
  function isTimeInputHrTime(value) {
    return Array.isArray(value) && value.length === 2 && typeof value[0] === "number" && typeof value[1] === "number";
  }
  function isTimeInput(value) {
    return isTimeInputHrTime(value) || typeof value === "number" || value instanceof Date;
  }
  function addHrTimes(time1, time2) {
    const out = [time1[0] + time2[0], time1[1] + time2[1]];
    if (out[1] >= SECOND_TO_NANOSECONDS) {
      out[1] -= SECOND_TO_NANOSECONDS;
      out[0] += 1;
    }
    return out;
  }

  // node_modules/@opentelemetry/core/dist/ExportResult.mjs
  var ExportResultCode = /* @__PURE__ */ (function(ExportResultCode2) {
    ExportResultCode2[ExportResultCode2["SUCCESS"] = 0] = "SUCCESS";
    ExportResultCode2[ExportResultCode2["FAILED"] = 1] = "FAILED";
    return ExportResultCode2;
  })({});

  // node_modules/@opentelemetry/core/dist/internal/validators.mjs
  var VALID_KEY_CHAR_RANGE = "[_0-9a-z-*/]";
  var VALID_KEY_REGEX = new RegExp(`^(?:${`[a-z]${VALID_KEY_CHAR_RANGE}{0,255}`}|${`[a-z0-9]${VALID_KEY_CHAR_RANGE}{0,240}@[a-z]${VALID_KEY_CHAR_RANGE}{0,13}`})$`);
  var VALID_VALUE_BASE_REGEX = /^[ -~]{0,255}[!-~]$/;
  var INVALID_VALUE_COMMA_EQUAL_REGEX = /,|=/;
  function validateKey(key) {
    return VALID_KEY_REGEX.test(key);
  }
  function validateValue(value) {
    return VALID_VALUE_BASE_REGEX.test(value) && !INVALID_VALUE_COMMA_EQUAL_REGEX.test(value);
  }

  // node_modules/@opentelemetry/core/dist/trace/TraceState.mjs
  var MAX_TRACE_STATE_ITEMS = 32;
  var MAX_TRACE_STATE_LEN = 512;
  var LIST_MEMBERS_SEPARATOR = ",";
  var LIST_MEMBER_KEY_VALUE_SPLITTER = "=";
  var TraceState = class TraceState2 {
    _length;
    _rawTraceState;
    _internalState;
    constructor(rawTraceState) {
      this._rawTraceState = typeof rawTraceState === "string" ? rawTraceState : "";
      this._length = this._rawTraceState.length;
    }
    set(key, value) {
      if (!validateKey(key) || !validateValue(value)) return this;
      const currState = this._getState();
      const currValue = currState.get(key);
      let newLength = this._length;
      if (typeof currValue === "string") newLength += value.length - currValue.length;
      else {
        if (currState.size >= MAX_TRACE_STATE_ITEMS) return this;
        newLength += key.length + value.length + (currState.size > 0 ? 2 : 1);
      }
      if (newLength > MAX_TRACE_STATE_LEN) return this;
      const newState = new Map(currState);
      newState.delete(key);
      newState.set(key, value);
      return this._fromState(newState, newLength);
    }
    unset(key) {
      const currState = this._getState();
      const currValue = currState.get(key);
      if (typeof currValue !== "string") return this;
      let newLength = this._length - (key.length + currValue.length + 1);
      if (currState.size > 1) newLength = newLength - 1;
      const newState = new Map(currState);
      newState.delete(key);
      return this._fromState(newState, newLength);
    }
    get(key) {
      return this._getState().get(key);
    }
    serialize() {
      let serialized = "";
      let index = 0;
      for (const entry of this._getState()) {
        if (index > 0) serialized = LIST_MEMBERS_SEPARATOR + serialized;
        serialized = `${entry[0]}${LIST_MEMBER_KEY_VALUE_SPLITTER}${entry[1]}` + serialized;
        index++;
      }
      return serialized;
    }
    _getState() {
      if (this._internalState) return this._internalState;
      const vendorMembers = this._rawTraceState.split(LIST_MEMBERS_SEPARATOR);
      const vendorEntries = /* @__PURE__ */ new Map();
      let currentLength = 0;
      for (const member of vendorMembers) {
        const m = member.trim();
        const idx = m.indexOf(LIST_MEMBER_KEY_VALUE_SPLITTER);
        if (idx === -1) continue;
        const key = m.slice(0, idx);
        const value = m.slice(idx + 1);
        if (!validateKey(key) || !validateValue(value)) continue;
        const futureLength = currentLength + m.length + (vendorEntries.size > 0 ? 1 : 0);
        if (futureLength > MAX_TRACE_STATE_LEN) continue;
        vendorEntries.set(key, value);
        currentLength = futureLength;
        if (vendorEntries.size >= MAX_TRACE_STATE_ITEMS) break;
      }
      this._length = currentLength;
      this._internalState = new Map(Array.from(vendorEntries.entries()).reverse());
      return this._internalState;
    }
    _fromState(state, length) {
      const traceState = Object.create(TraceState2.prototype);
      traceState._internalState = state;
      traceState._length = length;
      return traceState;
    }
  };

  // node_modules/@opentelemetry/core/dist/trace/W3CTraceContextPropagator.mjs
  var TRACE_PARENT_HEADER = "traceparent";
  var TRACE_STATE_HEADER = "tracestate";
  var VERSION2 = "00";
  var TRACE_PARENT_REGEX = new RegExp(`^\\s?((?!ff)[\\da-f]{2})-((?![0]{32})[\\da-f]{32})-((?![0]{16})[\\da-f]{16})-([\\da-f]{2})(-.*)?\\s?$`);
  function parseTraceParent(traceParent) {
    const match = TRACE_PARENT_REGEX.exec(traceParent);
    if (!match) return null;
    if (match[1] === "00" && match[5]) return null;
    return {
      traceId: match[2],
      spanId: match[3],
      traceFlags: parseInt(match[4], 16)
    };
  }
  var W3CTraceContextPropagator = class {
    inject(context2, carrier, setter) {
      const spanContext = trace.getSpanContext(context2);
      if (!spanContext || isTracingSuppressed(context2) || !isSpanContextValid(spanContext)) return;
      const traceParent = `${VERSION2}-${spanContext.traceId}-${spanContext.spanId}-0${Number(spanContext.traceFlags || TraceFlags.NONE).toString(16)}`;
      setter.set(carrier, TRACE_PARENT_HEADER, traceParent);
      if (spanContext.traceState) setter.set(carrier, TRACE_STATE_HEADER, spanContext.traceState.serialize());
    }
    extract(context2, carrier, getter) {
      const traceParentHeader = getter.get(carrier, TRACE_PARENT_HEADER);
      if (!traceParentHeader) return context2;
      const traceParent = Array.isArray(traceParentHeader) ? traceParentHeader[0] : traceParentHeader;
      if (typeof traceParent !== "string") return context2;
      const spanContext = parseTraceParent(traceParent);
      if (!spanContext) return context2;
      spanContext.isRemote = true;
      const traceStateHeader = getter.get(carrier, TRACE_STATE_HEADER);
      if (traceStateHeader) {
        const state = Array.isArray(traceStateHeader) ? traceStateHeader.join(",") : traceStateHeader;
        spanContext.traceState = new TraceState(typeof state === "string" ? state : void 0);
      }
      return trace.setSpanContext(context2, spanContext);
    }
    fields() {
      return [TRACE_PARENT_HEADER, TRACE_STATE_HEADER];
    }
  };

  // node_modules/@opentelemetry/core/dist/utils/url.mjs
  function urlMatches(url, urlToMatch) {
    if (typeof urlToMatch === "string") return url === urlToMatch;
    else return !!url.match(urlToMatch);
  }
  function isUrlIgnored(url, ignoredUrls) {
    if (!ignoredUrls) return false;
    for (const ignoreUrl of ignoredUrls) if (urlMatches(url, ignoreUrl)) return true;
    return false;
  }

  // node_modules/@opentelemetry/core/dist/utils/promise.mjs
  var Deferred = class {
    _promise;
    _resolve;
    _reject;
    constructor() {
      this._promise = new Promise((resolve, reject) => {
        this._resolve = resolve;
        this._reject = reject;
      });
    }
    get promise() {
      return this._promise;
    }
    resolve(val) {
      this._resolve(val);
    }
    reject(err) {
      this._reject(err);
    }
  };

  // node_modules/@opentelemetry/core/dist/utils/callback.mjs
  var BindOnceFuture = class {
    _isCalled = false;
    _deferred = new Deferred();
    _callback;
    _that;
    constructor(callback, that) {
      this._callback = callback;
      this._that = that;
    }
    get isCalled() {
      return this._isCalled;
    }
    get promise() {
      return this._deferred.promise;
    }
    call(...args) {
      if (!this._isCalled) {
        this._isCalled = true;
        try {
          Promise.resolve(this._callback.call(this._that, ...args)).then((val) => this._deferred.resolve(val), (err) => this._deferred.reject(err));
        } catch (err) {
          this._deferred.reject(err);
        }
      }
      return this._deferred.promise;
    }
  };

  // node_modules/@opentelemetry/core/dist/platform/browser/environment.mjs
  function getStringListFromEnv(_) {
  }

  // node_modules/@opentelemetry/core/dist/version.mjs
  var VERSION3 = "3.1.1";

  // node_modules/@opentelemetry/core/dist/semconv.mjs
  var ATTR_PROCESS_RUNTIME_NAME = "process.runtime.name";

  // node_modules/@opentelemetry/semantic-conventions/dist/stable_attributes.mjs
  var ATTR_ERROR_TYPE = "error.type";
  var ATTR_EXCEPTION_MESSAGE = "exception.message";
  var ATTR_EXCEPTION_STACKTRACE = "exception.stacktrace";
  var ATTR_EXCEPTION_TYPE = "exception.type";
  var ATTR_HTTP_REQUEST_METHOD = "http.request.method";
  var ATTR_HTTP_REQUEST_METHOD_ORIGINAL = "http.request.method_original";
  var ATTR_HTTP_RESPONSE_STATUS_CODE = "http.response.status_code";
  var ATTR_SERVER_ADDRESS = "server.address";
  var ATTR_SERVER_PORT = "server.port";
  var ATTR_SERVICE_NAME = "service.name";
  var ATTR_SERVICE_VERSION = "service.version";
  var ATTR_TELEMETRY_SDK_LANGUAGE = "telemetry.sdk.language";
  var TELEMETRY_SDK_LANGUAGE_VALUE_WEBJS = "webjs";
  var ATTR_TELEMETRY_SDK_NAME = "telemetry.sdk.name";
  var ATTR_TELEMETRY_SDK_VERSION = "telemetry.sdk.version";
  var ATTR_URL_FULL = "url.full";

  // node_modules/@opentelemetry/core/dist/platform/browser/sdk-info.mjs
  var SDK_INFO = {
    [ATTR_TELEMETRY_SDK_NAME]: "opentelemetry",
    [ATTR_PROCESS_RUNTIME_NAME]: "browser",
    [ATTR_TELEMETRY_SDK_LANGUAGE]: TELEMETRY_SDK_LANGUAGE_VALUE_WEBJS,
    [ATTR_TELEMETRY_SDK_VERSION]: VERSION3
  };

  // node_modules/@opentelemetry/exporter-trace-otlp-http/dist/semconv.mjs
  var OTEL_COMPONENT_TYPE_VALUE_OTLP_HTTP_SPAN_EXPORTER = "otlp_http_span_exporter";

  // node_modules/@opentelemetry/otlp-exporter-base/dist/OTLPExporterBase.mjs
  var OTLPExporterBase = class {
    _delegate;
    constructor(delegate) {
      this._delegate = delegate;
    }
    /**
    * Export items.
    * @param items
    * @param resultCallback
    */
    export(items, resultCallback) {
      this._delegate.export(items, resultCallback);
    }
    forceFlush() {
      return this._delegate.forceFlush();
    }
    shutdown() {
      return this._delegate.shutdown();
    }
    setMetrics(metrics2) {
      this._delegate.setMetrics(metrics2);
    }
  };

  // node_modules/@opentelemetry/otlp-exporter-base/dist/types.mjs
  var OTLPExporterError = class extends Error {
    code;
    name = "OTLPExporterError";
    data;
    constructor(message, code, data) {
      super(message);
      this.data = data;
      this.code = code;
    }
  };

  // node_modules/@opentelemetry/otlp-exporter-base/dist/configuration/shared-configuration.mjs
  function validateTimeoutMillis(timeoutMillis) {
    if (Number.isFinite(timeoutMillis) && timeoutMillis > 0) return timeoutMillis;
    throw new Error(`Configuration: timeoutMillis is invalid, expected number greater than 0 (actual: '${timeoutMillis}')`);
  }
  function wrapStaticHeadersInFunction(headers) {
    if (headers == null) return;
    return async () => headers;
  }
  function mergeOtlpSharedConfigurationWithDefaults(userProvidedConfiguration, fallbackConfiguration, defaultConfiguration) {
    return {
      timeoutMillis: validateTimeoutMillis(userProvidedConfiguration.timeoutMillis ?? fallbackConfiguration.timeoutMillis ?? defaultConfiguration.timeoutMillis),
      concurrencyLimit: userProvidedConfiguration.concurrencyLimit ?? fallbackConfiguration.concurrencyLimit ?? defaultConfiguration.concurrencyLimit,
      compression: userProvidedConfiguration.compression ?? fallbackConfiguration.compression ?? defaultConfiguration.compression
    };
  }
  function getSharedConfigurationDefaults() {
    return {
      timeoutMillis: 1e4,
      concurrencyLimit: 30,
      compression: "none"
    };
  }

  // node_modules/@opentelemetry/otlp-exporter-base/dist/bounded-queue-export-promise-handler.mjs
  var BoundedQueueExportPromiseHandler = class {
    _concurrencyLimit;
    _sendingPromises = [];
    /**
    * @param concurrencyLimit maximum promises allowed in a queue at the same time.
    */
    constructor(concurrencyLimit) {
      this._concurrencyLimit = concurrencyLimit;
    }
    pushPromise(promise) {
      if (this.hasReachedLimit()) throw new Error("Concurrency Limit reached");
      this._sendingPromises.push(promise);
      const popPromise = () => {
        const index = this._sendingPromises.indexOf(promise);
        this._sendingPromises.splice(index, 1);
      };
      promise.then(popPromise, popPromise);
    }
    hasReachedLimit() {
      return this._sendingPromises.length >= this._concurrencyLimit;
    }
    async awaitAll() {
      await Promise.all(this._sendingPromises);
    }
  };
  function createBoundedQueueExportPromiseHandler(options) {
    return new BoundedQueueExportPromiseHandler(options.concurrencyLimit);
  }

  // node_modules/@opentelemetry/otlp-exporter-base/dist/logging-response-handler.mjs
  function isPartialSuccessResponse(response) {
    return Object.prototype.hasOwnProperty.call(response, "partialSuccess");
  }
  function createLoggingPartialSuccessResponseHandler() {
    return { handleResponse(response) {
      if (response == null || !isPartialSuccessResponse(response) || response.partialSuccess == null || Object.keys(response.partialSuccess).length === 0) return;
      diag2.warn("Received Partial Success response:", JSON.stringify(response.partialSuccess));
    } };
  }

  // node_modules/@opentelemetry/otlp-exporter-base/dist/otlp-export-delegate.mjs
  var OTLPExportDelegate = class {
    _metrics;
    _diagLogger;
    _transport;
    _serializer;
    _responseHandler;
    _promiseQueue;
    _timeout;
    constructor(transport, serializer, responseHandler, promiseQueue, metrics2, timeout) {
      this._transport = transport;
      this._serializer = serializer;
      this._responseHandler = responseHandler;
      this._promiseQueue = promiseQueue;
      this._timeout = timeout;
      this._diagLogger = diag2.createComponentLogger({ namespace: "OTLPExportDelegate" });
      this._metrics = metrics2;
    }
    export(internalRepresentation, resultCallback) {
      this._diagLogger.debug("items to be sent", internalRepresentation);
      if (this._promiseQueue.hasReachedLimit()) {
        resultCallback({
          code: ExportResultCode.FAILED,
          error: /* @__PURE__ */ new Error("Concurrent export limit reached")
        });
        return;
      }
      const serializedRequest = this._serializer.serializeRequest(internalRepresentation);
      if (serializedRequest == null) {
        resultCallback({
          code: ExportResultCode.FAILED,
          error: /* @__PURE__ */ new Error("Nothing to send")
        });
        return;
      }
      const finishExport = this._metrics.startExport(internalRepresentation);
      this._promiseQueue.pushPromise(this._transport.send(serializedRequest, this._timeout).then((response) => {
        if (response.status === "success") {
          finishExport(void 0);
          if (response.data != null) try {
            this._responseHandler.handleResponse(this._serializer.deserializeResponse(response.data));
          } catch (e) {
            this._diagLogger.warn("Export succeeded but could not deserialize response - is the response specification compliant?", e, response.data);
          }
          resultCallback({ code: ExportResultCode.SUCCESS });
          return;
        } else if (response.status === "failure" && response.error) {
          finishExport(response.error);
          resultCallback({
            code: ExportResultCode.FAILED,
            error: response.error
          });
          return;
        } else if (response.status === "retryable") {
          finishExport("export_max_retries");
          resultCallback({
            code: ExportResultCode.FAILED,
            error: response.error ?? new OTLPExporterError("Export failed with retryable status")
          });
        } else {
          finishExport("export_failed");
          resultCallback({
            code: ExportResultCode.FAILED,
            error: new OTLPExporterError("Export failed with unknown error")
          });
        }
      }, (reason) => {
        finishExport(reason);
        resultCallback({
          code: ExportResultCode.FAILED,
          error: reason
        });
      }));
    }
    forceFlush() {
      return this._promiseQueue.awaitAll();
    }
    setMetrics(metrics2) {
      this._metrics = metrics2;
    }
    async shutdown() {
      this._diagLogger.debug("shutdown started");
      await this.forceFlush();
      this._transport.shutdown();
    }
  };
  function createOtlpExportDelegate(components, settings) {
    return new OTLPExportDelegate(components.transport, components.serializer, createLoggingPartialSuccessResponseHandler(), components.promiseHandler, components.metrics, settings.timeout);
  }

  // node_modules/@opentelemetry/otlp-exporter-base/dist/otlp-network-export-delegate.mjs
  function createOtlpNetworkExportDelegate(options, serializer, metrics2, transport) {
    return createOtlpExportDelegate({
      transport,
      serializer,
      promiseHandler: createBoundedQueueExportPromiseHandler(options),
      metrics: metrics2
    }, { timeout: options.timeoutMillis });
  }

  // node_modules/@opentelemetry/otlp-exporter-base/dist/semconv.mjs
  var ATTR_HTTP_RESPONSE_STATUS_CODE2 = "http.response.status_code";
  var ATTR_OTEL_COMPONENT_NAME = "otel.component.name";
  var ATTR_OTEL_COMPONENT_TYPE = "otel.component.type";
  var ATTR_SERVER_ADDRESS2 = "server.address";
  var ATTR_SERVER_PORT2 = "server.port";
  var ATTR_ERROR_TYPE2 = "error.type";

  // node_modules/@opentelemetry/otlp-exporter-base/dist/version.mjs
  var VERSION4 = "0.301.2";

  // node_modules/@opentelemetry/otlp-exporter-base/dist/ExporterMetrics.mjs
  var componentCounter = /* @__PURE__ */ new Map();
  var ExporterMetrics = class {
    inflight;
    exported;
    duration;
    standardAttrs;
    responseAttributesFromError;
    helper;
    constructor(options) {
      const { componentType, metricsHelper, meterProvider, url, responseAttributesFromError } = options;
      this.responseAttributesFromError = responseAttributesFromError;
      const meter = meterProvider ? meterProvider.getMeter("@opentelemetry/otlp-exporter", VERSION4) : createNoopMeter();
      const counter = componentCounter.get(componentType) ?? 0;
      componentCounter.set(componentType, counter + 1);
      this.standardAttrs = {
        [ATTR_OTEL_COMPONENT_TYPE]: componentType,
        [ATTR_OTEL_COMPONENT_NAME]: `${componentType}/${counter}`
      };
      if (url) {
        let urlToParse = url;
        if (!url.includes("://")) urlToParse = `http://${url}`;
        try {
          const parsedUrl = new URL(urlToParse);
          this.standardAttrs[ATTR_SERVER_ADDRESS2] = parsedUrl.hostname;
          let port = void 0;
          if (parsedUrl.port) port = Number(parsedUrl.port);
          else if (parsedUrl.protocol === "http:") port = 80;
          else if (parsedUrl.protocol === "https:") port = 443;
          if (typeof port === "number") this.standardAttrs[ATTR_SERVER_PORT2] = port;
        } catch {
        }
      }
      this.helper = metricsHelper;
      this.inflight = meter.createUpDownCounter(`otel.sdk.exporter.${this.helper.name}.inflight`, {
        unit: `{${this.helper.name}}`,
        description: `The number of ${this.helper.name}s which were passed to the exporter, but that have not been exported yet (neither successful, nor failed).`
      });
      this.exported = meter.createCounter(`otel.sdk.exporter.${this.helper.name}.exported`, {
        unit: `{${this.helper.name}}`,
        description: `The number of ${this.helper.name}s for which the export has finished, either successful or failed.`
      });
      this.duration = meter.createHistogram("otel.sdk.exporter.operation.duration", {
        unit: "s",
        description: "The duration of exporting a batch of telemetry records.",
        advice: { explicitBucketBoundaries: [] }
      });
    }
    startExport(request) {
      const numItems = this.helper.countItems(request);
      const startTime = hrTime();
      this.inflight.add(numItems, this.standardAttrs);
      return (error) => {
        const endTime = hrTime();
        this.inflight.add(-numItems, this.standardAttrs);
        const exportedAttrs = error ? {
          ...this.standardAttrs,
          [ATTR_ERROR_TYPE2]: error instanceof Error ? error.name : "export_failed"
        } : this.standardAttrs;
        this.exported.add(numItems, exportedAttrs);
        const durationAttrs = {
          ...exportedAttrs,
          ...this.responseAttributesFromError(error)
        };
        const duration = hrTimeToMilliseconds(hrTimeDuration(startTime, endTime)) / 1e3;
        this.duration.record(duration, durationAttrs);
      };
    }
  };

  // node_modules/@opentelemetry/otlp-transformer/dist/trace/index.mjs
  var TraceExporterMetricsHelper = {
    name: "span",
    countItems: (request) => request.length
  };

  // node_modules/@opentelemetry/otlp-transformer/dist/platform/browser/base64.mjs
  function encodeBase64(bytes) {
    const chars = new Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) chars[i] = String.fromCharCode(bytes[i]);
    return btoa(chars.join(""));
  }

  // node_modules/@opentelemetry/resources/dist/utils.mjs
  var isPromiseLike = (val) => {
    return val !== null && typeof val === "object" && typeof val.then === "function";
  };

  // node_modules/@opentelemetry/resources/dist/detectors/platform/browser/default-service-name.mjs
  function defaultServiceName() {
    return "unknown_service";
  }

  // node_modules/@opentelemetry/resources/dist/ResourceImpl.mjs
  var ResourceImpl = class ResourceImpl2 {
    _rawAttributes;
    _asyncAttributesPending = false;
    _schemaUrl;
    _memoizedAttributes;
    static FromAttributeList(attributes, options) {
      const res = new ResourceImpl2({}, options);
      res._rawAttributes = guardedRawAttributes(attributes);
      res._asyncAttributesPending = attributes.filter(([_, val]) => isPromiseLike(val)).length > 0;
      return res;
    }
    constructor(resource, options) {
      const attributes = resource.attributes ?? {};
      this._rawAttributes = Object.entries(attributes).map(([k, v]) => {
        if (isPromiseLike(v)) this._asyncAttributesPending = true;
        return [k, v];
      });
      this._rawAttributes = guardedRawAttributes(this._rawAttributes);
      this._schemaUrl = validateSchemaUrl(options?.schemaUrl);
    }
    get asyncAttributesPending() {
      return this._asyncAttributesPending;
    }
    async waitForAsyncAttributes() {
      if (!this.asyncAttributesPending) return;
      for (let i = 0; i < this._rawAttributes.length; i++) {
        const [k, v] = this._rawAttributes[i];
        this._rawAttributes[i] = [k, isPromiseLike(v) ? await v : v];
      }
      this._asyncAttributesPending = false;
    }
    get attributes() {
      if (this.asyncAttributesPending) diag2.error("Accessing resource attributes before async attributes settled");
      if (this._memoizedAttributes) return this._memoizedAttributes;
      const attrs = {};
      for (const [k, v] of this._rawAttributes) {
        if (isPromiseLike(v)) {
          diag2.debug(`Unsettled resource attribute ${k} skipped`);
          continue;
        }
        if (Object.hasOwn(attrs, k)) {
        } else if (k.length === 0) diag2.warn("dropping invalid resource attribute key: <empty string>");
        else if (!isSimpleAttributeValue(v)) diag2.warn(`dropping invalid resource attribute value for key "${k}"`);
        else attrs[k] = v;
      }
      if (!this._asyncAttributesPending) this._memoizedAttributes = attrs;
      return attrs;
    }
    getRawAttributes() {
      return this._rawAttributes;
    }
    get schemaUrl() {
      return this._schemaUrl;
    }
    merge(resource) {
      if (resource == null) return this;
      const mergedSchemaUrl = mergeSchemaUrl(this, resource);
      const mergedOptions = mergedSchemaUrl ? { schemaUrl: mergedSchemaUrl } : void 0;
      return ResourceImpl2.FromAttributeList([...resource.getRawAttributes(), ...this.getRawAttributes()], mergedOptions);
    }
  };
  function resourceFromAttributes(attributes, options) {
    return ResourceImpl.FromAttributeList(Object.entries(attributes), options);
  }
  function defaultResource() {
    return resourceFromAttributes({
      [ATTR_SERVICE_NAME]: defaultServiceName(),
      [ATTR_TELEMETRY_SDK_LANGUAGE]: SDK_INFO[ATTR_TELEMETRY_SDK_LANGUAGE],
      [ATTR_TELEMETRY_SDK_NAME]: SDK_INFO[ATTR_TELEMETRY_SDK_NAME],
      [ATTR_TELEMETRY_SDK_VERSION]: SDK_INFO[ATTR_TELEMETRY_SDK_VERSION]
    });
  }
  function guardedRawAttributes(attributes) {
    return attributes.map(([k, v]) => {
      if (isPromiseLike(v)) return [k, v.then((val) => val, (err) => {
        diag2.debug("promise rejection for resource attribute: %s - %s", k, err);
      })];
      return [k, v];
    });
  }
  function validateSchemaUrl(schemaUrl) {
    if (typeof schemaUrl === "string" || schemaUrl === void 0) return schemaUrl;
    diag2.warn("Schema URL must be string or undefined, got %s. Schema URL will be ignored.", schemaUrl);
  }
  function mergeSchemaUrl(old, updating) {
    const oldSchemaUrl = old?.schemaUrl;
    const updatingSchemaUrl = updating?.schemaUrl;
    const isOldEmpty = oldSchemaUrl === void 0 || oldSchemaUrl === "";
    const isUpdatingEmpty = updatingSchemaUrl === void 0 || updatingSchemaUrl === "";
    if (isOldEmpty) return updatingSchemaUrl;
    if (isUpdatingEmpty) return oldSchemaUrl;
    if (oldSchemaUrl === updatingSchemaUrl) return oldSchemaUrl;
    diag2.warn('Schema URL merge conflict: old resource has "%s", updating resource has "%s". Resulting resource will have undefined Schema URL.', oldSchemaUrl, updatingSchemaUrl);
  }

  // node_modules/@opentelemetry/otlp-transformer/dist/common/internal.mjs
  function createResource(resource, encoder) {
    const result = {
      attributes: toAttributes(resource.attributes, encoder),
      droppedAttributesCount: 0
    };
    const schemaUrl = resource.schemaUrl;
    if (schemaUrl && schemaUrl !== "") result.schemaUrl = schemaUrl;
    return result;
  }
  function createInstrumentationScope(scope, encoder) {
    const result = {
      name: scope.name,
      version: scope.version
    };
    if (scope.attributes && Object.keys(scope.attributes).length > 0) {
      result.attributes = toAttributes(scope.attributes, encoder);
      result.droppedAttributesCount = scope.droppedAttributesCount ?? 0;
    }
    return result;
  }
  function toAttributes(attributes, encoder) {
    return Object.keys(attributes).map((key) => toKeyValue(key, attributes[key], encoder));
  }
  function toKeyValue(key, value, encoder) {
    return {
      key,
      value: toAnyValue(value, encoder)
    };
  }
  function toAnyValue(value, encoder) {
    const t = typeof value;
    if (t === "string") return { stringValue: value };
    if (t === "number") {
      if (!Number.isInteger(value)) return { doubleValue: value };
      return { intValue: value };
    }
    if (t === "boolean") return { boolValue: value };
    if (value instanceof Uint8Array) return { bytesValue: encoder.encodeUint8Array(value) };
    if (Array.isArray(value)) {
      const values = new Array(value.length);
      for (let i = 0; i < value.length; i++) values[i] = toAnyValue(value[i], encoder);
      return { arrayValue: { values } };
    }
    if (t === "object" && value != null) {
      const keys = Object.keys(value);
      const values = new Array(keys.length);
      for (let i = 0; i < keys.length; i++) values[i] = {
        key: keys[i],
        value: toAnyValue(value[keys[i]], encoder)
      };
      return { kvlistValue: { values } };
    }
    return {};
  }

  // node_modules/@opentelemetry/otlp-transformer/dist/common/utils.mjs
  function hrTimeToNanos(hrTime2) {
    const NANOSECONDS = BigInt(1e9);
    return BigInt(Math.trunc(hrTime2[0])) * NANOSECONDS + BigInt(Math.trunc(hrTime2[1]));
  }
  function encodeAsString(hrTime2) {
    return hrTimeToNanos(hrTime2).toString();
  }
  var encodeTimestamp = typeof BigInt !== "undefined" ? encodeAsString : hrTimeToNanoseconds;
  function identity(value) {
    return value;
  }
  var JSON_ENCODER = {
    encodeHrTime: encodeTimestamp,
    encodeSpanContext: identity,
    encodeOptionalSpanContext: identity,
    encodeUint8Array: encodeBase64
  };

  // node_modules/@opentelemetry/otlp-transformer/dist/trace/internal.mjs
  var SPAN_FLAGS_CONTEXT_HAS_IS_REMOTE_MASK = 256;
  var SPAN_FLAGS_CONTEXT_IS_REMOTE_MASK = 512;
  function buildSpanFlagsFrom(traceFlags, isRemote) {
    let flags = traceFlags & 255 | SPAN_FLAGS_CONTEXT_HAS_IS_REMOTE_MASK;
    if (isRemote) flags |= SPAN_FLAGS_CONTEXT_IS_REMOTE_MASK;
    return flags;
  }
  function sdkSpanToOtlpSpan(span, encoder) {
    const ctx = span.spanContext();
    const status = span.status;
    const parentSpanId = span.parentSpanContext?.spanId ? encoder.encodeSpanContext(span.parentSpanContext?.spanId) : void 0;
    return {
      traceId: encoder.encodeSpanContext(ctx.traceId),
      spanId: encoder.encodeSpanContext(ctx.spanId),
      parentSpanId,
      traceState: ctx.traceState?.serialize(),
      name: span.name,
      kind: span.kind == null ? 0 : span.kind + 1,
      startTimeUnixNano: encoder.encodeHrTime(span.startTime),
      endTimeUnixNano: encoder.encodeHrTime(span.endTime),
      attributes: toAttributes(span.attributes, encoder),
      droppedAttributesCount: span.droppedAttributesCount,
      events: span.events.map((event) => toOtlpSpanEvent(event, encoder)),
      droppedEventsCount: span.droppedEventsCount,
      status: {
        code: status.code,
        message: status.message
      },
      links: span.links.map((link) => toOtlpLink(link, encoder)),
      droppedLinksCount: span.droppedLinksCount,
      flags: buildSpanFlagsFrom(ctx.traceFlags, span.parentSpanContext?.isRemote)
    };
  }
  function toOtlpLink(link, encoder) {
    return {
      attributes: link.attributes ? toAttributes(link.attributes, encoder) : [],
      spanId: encoder.encodeSpanContext(link.context.spanId),
      traceId: encoder.encodeSpanContext(link.context.traceId),
      traceState: link.context.traceState?.serialize(),
      droppedAttributesCount: link.droppedAttributesCount || 0,
      flags: buildSpanFlagsFrom(link.context.traceFlags, link.context.isRemote)
    };
  }
  function toOtlpSpanEvent(timedEvent, encoder) {
    return {
      attributes: timedEvent.attributes ? toAttributes(timedEvent.attributes, encoder) : [],
      name: timedEvent.name,
      timeUnixNano: encoder.encodeHrTime(timedEvent.time),
      droppedAttributesCount: timedEvent.droppedAttributesCount || 0
    };
  }
  function createExportTraceServiceRequest(spans, encoder) {
    return { resourceSpans: spanRecordsToResourceSpans(spans, encoder) };
  }
  function createResourceMap(readableSpans) {
    const resourceMap = /* @__PURE__ */ new Map();
    for (const record of readableSpans) {
      let ilsMap = resourceMap.get(record.resource);
      if (!ilsMap) {
        ilsMap = /* @__PURE__ */ new Map();
        resourceMap.set(record.resource, ilsMap);
      }
      const instrumentationScopeKey = `${record.instrumentationScope.name}@${record.instrumentationScope.version || ""}:${record.instrumentationScope.schemaUrl || ""}`;
      let records = ilsMap.get(instrumentationScopeKey);
      if (!records) {
        records = [];
        ilsMap.set(instrumentationScopeKey, records);
      }
      records.push(record);
    }
    return resourceMap;
  }
  function spanRecordsToResourceSpans(readableSpans, encoder) {
    const resourceMap = createResourceMap(readableSpans);
    const out = [];
    const entryIterator = resourceMap.entries();
    let entry = entryIterator.next();
    while (!entry.done) {
      const [resource, ilmMap] = entry.value;
      const scopeResourceSpans = [];
      const ilmIterator = ilmMap.values();
      let ilmEntry = ilmIterator.next();
      while (!ilmEntry.done) {
        const scopeSpans = ilmEntry.value;
        if (scopeSpans.length > 0) {
          const spans = scopeSpans.map((readableSpan) => sdkSpanToOtlpSpan(readableSpan, encoder));
          scopeResourceSpans.push({
            scope: createInstrumentationScope(scopeSpans[0].instrumentationScope, encoder),
            spans,
            schemaUrl: scopeSpans[0].instrumentationScope.schemaUrl
          });
        }
        ilmEntry = ilmIterator.next();
      }
      const processedResource = createResource(resource, encoder);
      const transformedSpans = {
        resource: processedResource,
        scopeSpans: scopeResourceSpans,
        schemaUrl: processedResource.schemaUrl
      };
      out.push(transformedSpans);
      entry = entryIterator.next();
    }
    return out;
  }

  // node_modules/@opentelemetry/otlp-transformer/dist/trace/json/trace.mjs
  var JsonTraceSerializer = {
    serializeRequest: (arg) => {
      const request = createExportTraceServiceRequest(arg, JSON_ENCODER);
      return new TextEncoder().encode(JSON.stringify(request));
    },
    deserializeResponse: (arg) => {
      if (arg.length === 0) return {};
      const decoder = new TextDecoder();
      try {
        return JSON.parse(decoder.decode(arg));
      } catch (err) {
        diag2.warn(`Failed to parse trace export response: ${err.message}. Returning empty response`);
        return {};
      }
    }
  };

  // node_modules/@opentelemetry/otlp-exporter-base/dist/retrying-transport.mjs
  var MAX_ATTEMPTS = 5;
  var INITIAL_BACKOFF = 1e3;
  var MAX_BACKOFF = 5e3;
  var BACKOFF_MULTIPLIER = 1.5;
  var JITTER = 0.2;
  function getJitter() {
    return Math.random() * (2 * JITTER) - JITTER;
  }
  var RetryingTransport = class {
    _transport;
    constructor(transport) {
      this._transport = transport;
    }
    retry(data, timeoutMillis, inMillis) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          this._transport.send(data, timeoutMillis).then(resolve, reject);
        }, inMillis);
      });
    }
    async send(data, timeoutMillis) {
      let attempts = MAX_ATTEMPTS;
      let nextBackoff = INITIAL_BACKOFF;
      const deadline = Date.now() + timeoutMillis;
      let result = await this._transport.send(data, timeoutMillis);
      while (result.status === "retryable" && attempts > 0) {
        attempts--;
        const backoff = Math.max(Math.min(nextBackoff * (1 + getJitter()), MAX_BACKOFF), 0);
        nextBackoff = nextBackoff * BACKOFF_MULTIPLIER;
        const retryInMillis = result.retryInMillis ?? backoff;
        const remainingTimeoutMillis = deadline - Date.now();
        if (retryInMillis > remainingTimeoutMillis) {
          diag2.info(`Export retry time ${Math.round(retryInMillis)}ms exceeds remaining timeout ${Math.round(remainingTimeoutMillis)}ms, not retrying further.`);
          return result;
        }
        diag2.verbose(`Scheduling export retry in ${Math.round(retryInMillis)}ms`);
        result = await this.retry(data, remainingTimeoutMillis, retryInMillis);
      }
      if (result.status === "success") diag2.verbose(`Export succeeded after ${MAX_ATTEMPTS - attempts} retry attempts.`);
      else if (result.status === "retryable") diag2.info(`Export failed after maximum retry attempts (${MAX_ATTEMPTS}).`);
      else diag2.info(`Export failed with non-retryable error: ${result.error}`);
      return result;
    }
    shutdown() {
      return this._transport.shutdown();
    }
  };
  function createRetryingTransport(options) {
    return new RetryingTransport(options.transport);
  }

  // node_modules/@opentelemetry/otlp-exporter-base/dist/is-export-retryable.mjs
  function isExportHTTPErrorRetryable(statusCode) {
    return statusCode === 429 || statusCode === 502 || statusCode === 503 || statusCode === 504;
  }
  function parseRetryAfterToMills(retryAfter) {
    if (retryAfter == null) return;
    const seconds = Number.parseInt(retryAfter, 10);
    if (Number.isInteger(seconds)) return seconds > 0 ? seconds * 1e3 : -1;
    const delay = new Date(retryAfter).getTime() - Date.now();
    if (delay >= 0) return delay;
    return 0;
  }

  // node_modules/@opentelemetry/otlp-exporter-base/dist/platform/browser/transport/fetch-transport.mjs
  var MAX_KEEPALIVE_BODY_SIZE = 61440;
  var MAX_KEEPALIVE_REQUESTS = 9;
  var pendingBodySize = 0;
  var pendingKeepaliveCount = 0;
  var FetchTransport = class {
    _parameters;
    constructor(parameters) {
      this._parameters = parameters;
    }
    async send(data, timeoutMillis) {
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), timeoutMillis);
      let fetchApi = globalThis.fetch;
      if (typeof fetchApi.__original === "function") fetchApi = fetchApi.__original;
      const requestSize = data.byteLength;
      const wouldExceedSize = pendingBodySize + requestSize > MAX_KEEPALIVE_BODY_SIZE;
      const useKeepalive = !wouldExceedSize && !(pendingKeepaliveCount >= MAX_KEEPALIVE_REQUESTS);
      if (useKeepalive) {
        pendingBodySize += requestSize;
        pendingKeepaliveCount++;
      } else {
        const reason = wouldExceedSize ? "size limit" : "count limit";
        diag2.debug(`keepalive disabled: ${(requestSize / 1024).toFixed(1)}KB payload, ${pendingKeepaliveCount} pending (${reason})`);
      }
      const suppressedContext = suppressTracing(context.active());
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        if (useKeepalive) {
          pendingBodySize -= requestSize;
          pendingKeepaliveCount--;
        }
        clearTimeout(timeout);
      };
      let drainOwnsCleanup = false;
      try {
        const url = new URL(this._parameters.url);
        const headers = await this._parameters.headers();
        const response = await context.with(suppressedContext, () => fetchApi(url.href, {
          method: "POST",
          headers,
          body: data,
          signal: abortController.signal,
          keepalive: useKeepalive,
          mode: globalThis.location ? globalThis.origin === url.origin ? "same-origin" : "cors" : "no-cors"
        }));
        drainResponseBody(response).then(release, release);
        drainOwnsCleanup = true;
        if (response.status >= 200 && response.status <= 299) {
          diag2.debug(`export response success (status: ${response.status})`);
          return { status: "success" };
        } else if (isExportHTTPErrorRetryable(response.status)) {
          diag2.warn(`export response retryable (status: ${response.status})`);
          const retryAfter = response.headers.get("Retry-After");
          return {
            status: "retryable",
            retryInMillis: parseRetryAfterToMills(retryAfter)
          };
        }
        diag2.error(`export response failure (status: ${response.status})`);
        return {
          status: "failure",
          error: /* @__PURE__ */ new Error(`Fetch request failed with non-retryable status ${response.status}`)
        };
      } catch (error) {
        if (isFetchNetworkErrorRetryable(error)) {
          diag2.warn(`export request retryable (network error: ${error})`);
          return {
            status: "retryable",
            error: new Error("Fetch request encountered a network error", { cause: error })
          };
        }
        diag2.error(`export request failure (error: ${error})`);
        return {
          status: "failure",
          error: new Error("Fetch request errored", { cause: error })
        };
      } finally {
        if (!drainOwnsCleanup) release();
      }
    }
    shutdown() {
    }
  };
  function createFetchTransport(parameters) {
    return new FetchTransport(parameters);
  }
  function isFetchNetworkErrorRetryable(error) {
    return error instanceof TypeError && !error.cause;
  }
  async function drainResponseBody(response) {
    try {
      const body = response.body;
      if (body == null) return;
      const reader = body.getReader();
      try {
        let chunk = await reader.read();
        while (!chunk.done) chunk = await reader.read();
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      diag2.debug(`error reading export response body: ${error}`);
    }
  }

  // node_modules/@opentelemetry/otlp-exporter-base/dist/platform/browser/otlp-browser-http-export-delegate.mjs
  function createOtlpFetchExportDelegate(options, serializer, metrics2) {
    return createOtlpNetworkExportDelegate(options, serializer, metrics2, createRetryingTransport({ transport: createFetchTransport(options) }));
  }

  // node_modules/@opentelemetry/otlp-exporter-base/dist/util.mjs
  function validateAndNormalizeHeaders(partialHeaders) {
    const headers = {};
    Object.entries(partialHeaders ?? {}).forEach(([key, value]) => {
      if (typeof value !== "undefined") headers[key] = String(value);
      else diag2.warn(`Header "${key}" has invalid value (${value}) and will be ignored`);
    });
    return headers;
  }

  // node_modules/@opentelemetry/otlp-exporter-base/dist/configuration/otlp-http-configuration.mjs
  function mergeHeaders(userProvidedHeaders, fallbackHeaders, defaultHeaders) {
    return async () => {
      const requiredHeaders = { ...await defaultHeaders() };
      const headers = {};
      if (fallbackHeaders != null) Object.assign(headers, await fallbackHeaders());
      if (userProvidedHeaders != null) Object.assign(headers, validateAndNormalizeHeaders(await userProvidedHeaders()));
      return Object.assign(headers, requiredHeaders);
    };
  }
  function validateUserProvidedUrl(url) {
    if (url == null) return;
    try {
      const base = globalThis.location?.href;
      return new URL(url, base).href;
    } catch {
      throw new Error(`Configuration: Could not parse user-provided export URL: '${url}'`);
    }
  }
  function mergeOtlpHttpConfigurationWithDefaults(userProvidedConfiguration, fallbackConfiguration, defaultConfiguration) {
    return {
      ...mergeOtlpSharedConfigurationWithDefaults(userProvidedConfiguration, fallbackConfiguration, defaultConfiguration),
      headers: mergeHeaders(userProvidedConfiguration.headers, fallbackConfiguration.headers, defaultConfiguration.headers),
      url: validateUserProvidedUrl(userProvidedConfiguration.url) ?? fallbackConfiguration.url ?? defaultConfiguration.url
    };
  }
  function getHttpConfigurationDefaults(requiredHeaders, signalResourcePath) {
    return {
      ...getSharedConfigurationDefaults(),
      headers: async () => requiredHeaders,
      url: "http://localhost:4318/" + signalResourcePath
    };
  }

  // node_modules/@opentelemetry/otlp-exporter-base/dist/configuration/convert-legacy-http-options.mjs
  function convertLegacyHeaders(config) {
    if (typeof config.headers === "function") return config.headers;
    return wrapStaticHeadersInFunction(config.headers);
  }

  // node_modules/@opentelemetry/otlp-exporter-base/dist/platform/browser/configuration/convert-legacy-browser-http-options.mjs
  function convertLegacyBrowserHttpOptions(config, signalResourcePath, requiredHeaders) {
    return mergeOtlpHttpConfigurationWithDefaults({
      url: config.url,
      timeoutMillis: config.timeoutMillis,
      headers: convertLegacyHeaders(config),
      concurrencyLimit: config.concurrencyLimit
    }, {}, getHttpConfigurationDefaults(requiredHeaders, signalResourcePath));
  }

  // node_modules/@opentelemetry/otlp-exporter-base/dist/platform/browser/configuration/create-legacy-browser-delegate.mjs
  function createLegacyOtlpBrowserExporterMetrics(metricsComponentType, exporterMetricsHelper, url, meterProvider) {
    return new ExporterMetrics({
      componentType: metricsComponentType,
      metricsHelper: exporterMetricsHelper,
      url,
      meterProvider,
      responseAttributesFromError: (error) => {
        if (!error) return { [ATTR_HTTP_RESPONSE_STATUS_CODE2]: 200 };
        if (!(error instanceof Error)) return {};
        if (error.message.startsWith("Fetch request failed with non-retryable status ")) {
          const statusStr = error.message.substring(47);
          return { [ATTR_HTTP_RESPONSE_STATUS_CODE2]: Number(statusStr) };
        }
        return {};
      }
    });
  }
  function createLegacyOtlpBrowserExportDelegate(config, serializer, metricsComponentType, exporterMetricsHelper, meterProvider, signalResourcePath, requiredHeaders) {
    const options = convertLegacyBrowserHttpOptions(config, signalResourcePath, requiredHeaders);
    return createOtlpFetchExportDelegate(options, serializer, createLegacyOtlpBrowserExporterMetrics(metricsComponentType, exporterMetricsHelper, options.url, config.selfObsMeterProvider));
  }

  // node_modules/@opentelemetry/exporter-trace-otlp-http/dist/platform/browser/OTLPTraceExporter.mjs
  var OTLPTraceExporter = class extends OTLPExporterBase {
    constructor(config = {}) {
      super(createLegacyOtlpBrowserExportDelegate(config, JsonTraceSerializer, OTEL_COMPONENT_TYPE_VALUE_OTLP_HTTP_SPAN_EXPORTER, TraceExporterMetricsHelper, config.selfObsMeterProvider, "v1/traces", { "Content-Type": "application/json" }));
    }
  };

  // node_modules/@opentelemetry/instrumentation/dist/autoLoaderUtils.mjs
  function enableInstrumentations(instrumentations, tracerProvider, meterProvider, loggerProvider) {
    for (let i = 0, j = instrumentations.length; i < j; i++) {
      const instrumentation = instrumentations[i];
      if (tracerProvider) instrumentation.setTracerProvider(tracerProvider);
      if (meterProvider) instrumentation.setMeterProvider(meterProvider);
      if (loggerProvider && instrumentation.setLoggerProvider) instrumentation.setLoggerProvider(loggerProvider);
      if (!instrumentation.getConfig().enabled) instrumentation.enable();
    }
  }
  function disableInstrumentations(instrumentations) {
    instrumentations.forEach((instrumentation) => instrumentation.disable());
  }

  // node_modules/@opentelemetry/instrumentation/dist/autoLoader.mjs
  function registerInstrumentations(options) {
    const tracerProvider = options.tracerProvider || trace.getTracerProvider();
    const meterProvider = options.meterProvider || metrics.getMeterProvider();
    const loggerProvider = options.loggerProvider || logs.getLoggerProvider();
    const instrumentations = options.instrumentations?.flat() ?? [];
    enableInstrumentations(instrumentations, tracerProvider, meterProvider, loggerProvider);
    return () => {
      disableInstrumentations(instrumentations);
    };
  }

  // node_modules/@opentelemetry/instrumentation/dist/utils.mjs
  function safeExecuteInTheMiddle(execute, onFinish, preventThrowingError) {
    let error;
    let result;
    try {
      result = execute();
    } catch (e) {
      error = e;
    } finally {
      onFinish(error, result);
      if (error && !preventThrowingError) throw error;
      return result;
    }
  }

  // node_modules/@opentelemetry/instrumentation/dist/shimmer.mjs
  var logger = console.error.bind(console);
  function defineProperty(obj, name, value) {
    const enumerable = !!obj[name] && Object.prototype.propertyIsEnumerable.call(obj, name);
    Object.defineProperty(obj, name, {
      configurable: true,
      enumerable,
      writable: true,
      value
    });
  }
  var wrap = (nodule, name, wrapper) => {
    if (!nodule || !nodule[name]) {
      logger("no original function " + String(name) + " to wrap");
      return;
    }
    if (!wrapper) {
      logger("no wrapper function");
      logger((/* @__PURE__ */ new Error()).stack);
      return;
    }
    const original = nodule[name];
    if (typeof original !== "function" || typeof wrapper !== "function") {
      logger("original object and wrapper must be functions");
      return;
    }
    const wrapped = wrapper(original, name);
    defineProperty(wrapped, "__original", original);
    defineProperty(wrapped, "__unwrap", () => {
      if (nodule[name] === wrapped) defineProperty(nodule, name, original);
    });
    defineProperty(wrapped, "__wrapped", true);
    defineProperty(nodule, name, wrapped);
    return wrapped;
  };
  var massWrap = (nodules, names, wrapper) => {
    if (!nodules) {
      logger("must provide one or more modules to patch");
      logger((/* @__PURE__ */ new Error()).stack);
      return;
    } else if (!Array.isArray(nodules)) nodules = [nodules];
    if (!(names && Array.isArray(names))) {
      logger("must provide one or more functions to wrap on modules");
      return;
    }
    nodules.forEach((nodule) => {
      names.forEach((name) => {
        wrap(nodule, name, wrapper);
      });
    });
  };
  var unwrap = (nodule, name) => {
    if (!nodule || !nodule[name]) {
      logger("no function to unwrap.");
      logger((/* @__PURE__ */ new Error()).stack);
      return;
    }
    const wrapped = nodule[name];
    if (!wrapped.__unwrap) logger("no original to unwrap to -- has " + String(name) + " already been unwrapped?");
    else {
      wrapped.__unwrap();
      return;
    }
  };
  var massUnwrap = (nodules, names) => {
    if (!nodules) {
      logger("must provide one or more modules to patch");
      logger((/* @__PURE__ */ new Error()).stack);
      return;
    } else if (!Array.isArray(nodules)) nodules = [nodules];
    if (!(names && Array.isArray(names))) {
      logger("must provide one or more functions to unwrap on modules");
      return;
    }
    nodules.forEach((nodule) => {
      names.forEach((name) => {
        unwrap(nodule, name);
      });
    });
  };
  function shimmer(options) {
    if (options && options.logger) {
      if (typeof options.logger !== "function") logger("new logger isn't a function, not replacing");
      else logger = options.logger;
    }
  }
  shimmer.wrap = wrap;
  shimmer.massWrap = massWrap;
  shimmer.unwrap = unwrap;
  shimmer.massUnwrap = massUnwrap;

  // node_modules/@opentelemetry/instrumentation/dist/instrumentation.mjs
  var InstrumentationAbstract = class {
    _config = {};
    _tracer;
    _meter;
    _logger;
    _diag;
    instrumentationName;
    instrumentationVersion;
    constructor(instrumentationName, instrumentationVersion, config) {
      this.instrumentationName = instrumentationName;
      this.instrumentationVersion = instrumentationVersion;
      this.setConfig(config);
      this._diag = diag2.createComponentLogger({ namespace: instrumentationName });
      this._tracer = trace.getTracer(instrumentationName, instrumentationVersion);
      this._meter = metrics.getMeter(instrumentationName, instrumentationVersion);
      this._logger = logs.getLogger(instrumentationName, instrumentationVersion);
      this._updateMetricInstruments();
    }
    _wrap = wrap;
    _unwrap = unwrap;
    _massWrap = massWrap;
    _massUnwrap = massUnwrap;
    get meter() {
      return this._meter;
    }
    /**
    * Sets MeterProvider to this plugin
    * @param meterProvider
    */
    setMeterProvider(meterProvider) {
      this._meter = meterProvider.getMeter(this.instrumentationName, this.instrumentationVersion);
      this._updateMetricInstruments();
    }
    get logger() {
      return this._logger;
    }
    /**
    * Sets LoggerProvider to this plugin
    * @param loggerProvider
    */
    setLoggerProvider(loggerProvider) {
      this._logger = loggerProvider.getLogger(this.instrumentationName, this.instrumentationVersion);
    }
    /**
    * @experimental
    *
    * Get module definitions defined by {@link init}.
    * This can be used for experimental compile-time instrumentation.
    *
    * @returns an array of {@link InstrumentationModuleDefinition}
    */
    getModuleDefinitions() {
      const initResult = this.init() ?? [];
      if (!Array.isArray(initResult)) return [initResult];
      return initResult;
    }
    /**
    * Sets the new metric instruments with the current Meter.
    */
    _updateMetricInstruments() {
    }
    getConfig() {
      return this._config;
    }
    /**
    * Sets InstrumentationConfig to this plugin
    * @param config
    */
    setConfig(config) {
      this._config = {
        enabled: true,
        ...config
      };
    }
    /**
    * Sets TracerProvider to this plugin
    * @param tracerProvider
    */
    setTracerProvider(tracerProvider) {
      this._tracer = tracerProvider.getTracer(this.instrumentationName, this.instrumentationVersion);
    }
    get tracer() {
      return this._tracer;
    }
    /**
    * Execute span customization hook, if configured, and log any errors.
    * Any semantics of the trigger and info are defined by the specific instrumentation.
    * @param hookHandler The optional hook handler which the user has configured via instrumentation config
    * @param triggerName The name of the trigger for executing the hook for logging purposes
    * @param span The span to which the hook should be applied
    * @param info The info object to be passed to the hook, with useful data the hook may use
    */
    _runSpanCustomizationHook(hookHandler, triggerName, span, info) {
      if (!hookHandler) return;
      try {
        hookHandler(span, info);
      } catch (e) {
        this._diag.error("Error running span customization hook due to exception in handler", { triggerName }, e);
      }
    }
  };

  // node_modules/@opentelemetry/instrumentation/dist/platform/browser/instrumentation.mjs
  var InstrumentationBase = class extends InstrumentationAbstract {
    /** Subclasses set this to true when their enable() succeeds and to false in
    * their disable(); isEnabled() returns it. */
    _enabled = false;
    constructor(instrumentationName, instrumentationVersion, config) {
      super(instrumentationName, instrumentationVersion, config);
      if (this._config.enabled) this.enable();
    }
    /** Returns `_enabled`, which stays false unless the subclass's enable() sets it. */
    isEnabled() {
      return this._enabled;
    }
  };

  // node_modules/@opentelemetry/instrumentation-fetch/dist/semconv.mjs
  var ATTR_HTTP_REQUEST_BODY_SIZE = "http.request.body.size";

  // node_modules/@opentelemetry/instrumentation-fetch/dist/utils.mjs
  var DIAG_LOGGER = diag2.createComponentLogger({ namespace: "@opentelemetry/opentelemetry-instrumentation-fetch/utils" });
  function getFetchBodyLength(...args) {
    if (args[0] instanceof URL || typeof args[0] === "string") {
      const requestInit = args[1];
      if (!requestInit?.body) return Promise.resolve();
      if (requestInit.body instanceof ReadableStream) {
        const { body, length } = _getBodyNonDestructively(requestInit.body);
        requestInit.body = body;
        return length;
      } else return Promise.resolve(getXHRBodyLength(requestInit.body));
    } else {
      const info = args[0];
      if (!info?.body) return Promise.resolve();
      return info.clone().text().then((t) => getByteLength(t));
    }
  }
  function _getBodyNonDestructively(body) {
    if (!body.pipeThrough) {
      DIAG_LOGGER.warn("Platform has ReadableStream but not pipeThrough!");
      return {
        body,
        length: Promise.resolve(void 0)
      };
    }
    let length = 0;
    let resolveLength;
    const lengthPromise = new Promise((resolve) => {
      resolveLength = resolve;
    });
    const transform = new TransformStream({
      start() {
      },
      async transform(chunk, controller) {
        const bytearray = await chunk;
        length += bytearray.byteLength;
        controller.enqueue(chunk);
      },
      flush() {
        resolveLength(length);
      }
    });
    return {
      body: body.pipeThrough(transform),
      length: lengthPromise
    };
  }
  function isDocument(value) {
    return typeof Document !== "undefined" && value instanceof Document;
  }
  function getXHRBodyLength(body) {
    if (isDocument(body)) return new XMLSerializer().serializeToString(document).length;
    if (typeof body === "string") return getByteLength(body);
    if (body instanceof Blob) return body.size;
    if (body instanceof FormData) return getFormDataSize(body);
    if (body instanceof URLSearchParams) return getByteLength(body.toString());
    if (body.byteLength !== void 0) return body.byteLength;
    DIAG_LOGGER.warn("unknown body type");
  }
  var TEXT_ENCODER = new TextEncoder();
  function getByteLength(s) {
    return TEXT_ENCODER.encode(s).byteLength;
  }
  function getFormDataSize(formData) {
    let size = 0;
    for (const [key, value] of formData.entries()) {
      size += key.length;
      if (value instanceof Blob) size += value.size;
      else size += value.length;
    }
    return size;
  }
  function normalizeHttpRequestMethod(method) {
    const knownMethods2 = getKnownMethods();
    const methUpper = method.toUpperCase();
    if (methUpper in knownMethods2) return methUpper;
    else return "_OTHER";
  }
  var DEFAULT_KNOWN_METHODS = {
    CONNECT: true,
    DELETE: true,
    GET: true,
    HEAD: true,
    OPTIONS: true,
    PATCH: true,
    POST: true,
    PUT: true,
    TRACE: true,
    QUERY: true
  };
  var knownMethods;
  function getKnownMethods() {
    if (knownMethods === void 0) {
      const cfgMethods = getStringListFromEnv("OTEL_INSTRUMENTATION_HTTP_KNOWN_METHODS");
      if (cfgMethods && cfgMethods.length > 0) {
        knownMethods = {};
        cfgMethods.forEach((m) => {
          knownMethods[m] = true;
        });
      } else knownMethods = DEFAULT_KNOWN_METHODS;
    }
    return knownMethods;
  }
  var HTTP_PORT_FROM_PROTOCOL = {
    "https:": "443",
    "http:": "80"
  };
  function serverPortFromUrl(url) {
    const serverPort = Number(url.port || HTTP_PORT_FROM_PROTOCOL[url.protocol]);
    if (serverPort && !isNaN(serverPort)) return serverPort;
    else return;
  }
  var STR_REDACTED = "REDACTED";
  var DEFAULT_QUERY_STRINGS_TO_REDACT = [
    "sig",
    "Signature",
    "AWSAccessKeyId",
    "X-Goog-Signature",
    "X-Amz-Signature",
    "X-Amz-Credential",
    "X-Amz-Security-Token"
  ];
  function decodeQueryKey(key) {
    try {
      return decodeURIComponent(key.replace(/\+/g, " "));
    } catch {
      return key;
    }
  }
  function redactUrl(url) {
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return url;
    }
    let redacted = false;
    if (parsedUrl.username || parsedUrl.password) {
      parsedUrl.username = STR_REDACTED;
      parsedUrl.password = STR_REDACTED;
      redacted = true;
    }
    if (parsedUrl.search.length > 1) {
      let queryRedacted = false;
      const pairs = parsedUrl.search.slice(1).split("&").map((pair) => {
        const separator = pair.indexOf("=");
        const key = separator === -1 ? pair : pair.slice(0, separator);
        if (DEFAULT_QUERY_STRINGS_TO_REDACT.includes(decodeQueryKey(key))) {
          queryRedacted = true;
          return `${key}=${STR_REDACTED}`;
        }
        return pair;
      });
      if (queryRedacted) {
        parsedUrl.search = `?${pairs.join("&")}`;
        redacted = true;
      }
    }
    return redacted ? parsedUrl.href : url;
  }

  // node_modules/@opentelemetry/instrumentation-fetch/dist/version.mjs
  var VERSION5 = "0.301.2";

  // node_modules/@opentelemetry/web-common/dist/enums/PerformanceTimingNames.mjs
  var PerformanceTimingNames = /* @__PURE__ */ (function(PerformanceTimingNames2) {
    PerformanceTimingNames2["CONNECT_END"] = "connectEnd";
    PerformanceTimingNames2["CONNECT_START"] = "connectStart";
    PerformanceTimingNames2["DECODED_BODY_SIZE"] = "decodedBodySize";
    PerformanceTimingNames2["DOM_COMPLETE"] = "domComplete";
    PerformanceTimingNames2["DOM_CONTENT_LOADED_EVENT_END"] = "domContentLoadedEventEnd";
    PerformanceTimingNames2["DOM_CONTENT_LOADED_EVENT_START"] = "domContentLoadedEventStart";
    PerformanceTimingNames2["DOM_INTERACTIVE"] = "domInteractive";
    PerformanceTimingNames2["DOMAIN_LOOKUP_END"] = "domainLookupEnd";
    PerformanceTimingNames2["DOMAIN_LOOKUP_START"] = "domainLookupStart";
    PerformanceTimingNames2["ENCODED_BODY_SIZE"] = "encodedBodySize";
    PerformanceTimingNames2["FETCH_START"] = "fetchStart";
    PerformanceTimingNames2["LOAD_EVENT_END"] = "loadEventEnd";
    PerformanceTimingNames2["LOAD_EVENT_START"] = "loadEventStart";
    PerformanceTimingNames2["NAVIGATION_START"] = "navigationStart";
    PerformanceTimingNames2["REDIRECT_END"] = "redirectEnd";
    PerformanceTimingNames2["REDIRECT_START"] = "redirectStart";
    PerformanceTimingNames2["REQUEST_START"] = "requestStart";
    PerformanceTimingNames2["RESPONSE_END"] = "responseEnd";
    PerformanceTimingNames2["RESPONSE_START"] = "responseStart";
    PerformanceTimingNames2["SECURE_CONNECTION_START"] = "secureConnectionStart";
    PerformanceTimingNames2["START_TIME"] = "startTime";
    PerformanceTimingNames2["UNLOAD_EVENT_END"] = "unloadEventEnd";
    PerformanceTimingNames2["UNLOAD_EVENT_START"] = "unloadEventStart";
    return PerformanceTimingNames2;
  })({});

  // node_modules/@opentelemetry/web-common/dist/utils-resource-timings.mjs
  var urlNormalizingAnchor;
  function getUrlNormalizingAnchor() {
    if (!urlNormalizingAnchor) urlNormalizingAnchor = document.createElement("a");
    return urlNormalizingAnchor;
  }
  function hasKey(obj, key) {
    return key in obj;
  }
  function addSpanNetworkEvent(span, performanceName, entries, ignoreZeros = true) {
    if (hasKey(entries, performanceName) && typeof entries[performanceName] === "number" && !(ignoreZeros && entries[performanceName] === 0)) return span.addEvent(performanceName, entries[performanceName]);
  }
  function addSpanNetworkEvents(span, resource, ignoreNetworkEvents = false, ignoreZeros) {
    if (ignoreZeros === void 0) ignoreZeros = resource["startTime"] !== 0;
    if (!ignoreNetworkEvents) {
      addSpanNetworkEvent(span, "fetchStart", resource, ignoreZeros);
      addSpanNetworkEvent(span, "domainLookupStart", resource, ignoreZeros);
      addSpanNetworkEvent(span, "domainLookupEnd", resource, ignoreZeros);
      addSpanNetworkEvent(span, "connectStart", resource, ignoreZeros);
      addSpanNetworkEvent(span, "secureConnectionStart", resource, ignoreZeros);
      addSpanNetworkEvent(span, "connectEnd", resource, ignoreZeros);
      addSpanNetworkEvent(span, "requestStart", resource, ignoreZeros);
      addSpanNetworkEvent(span, "responseStart", resource, ignoreZeros);
      addSpanNetworkEvent(span, "responseEnd", resource, ignoreZeros);
    }
  }
  function sortResources(filteredResources) {
    return filteredResources.slice().sort((a, b) => {
      const valueA = a["fetchStart"];
      const valueB = b["fetchStart"];
      if (valueA > valueB) return 1;
      else if (valueA < valueB) return -1;
      return 0;
    });
  }
  function getOrigin() {
    return typeof location !== "undefined" ? location.origin : void 0;
  }
  function getResource(spanUrl, startTimeHR, endTimeHR, resources, ignoredResources = /* @__PURE__ */ new WeakSet(), initiatorType) {
    const parsedSpanUrl = parseUrl(spanUrl);
    spanUrl = parsedSpanUrl.toString();
    const filteredResources = filterResourcesForSpan(spanUrl, startTimeHR, endTimeHR, resources, ignoredResources, initiatorType);
    if (filteredResources.length === 0) return { mainRequest: void 0 };
    if (filteredResources.length === 1) return { mainRequest: filteredResources[0] };
    const sorted = sortResources(filteredResources);
    if (parsedSpanUrl.origin !== getOrigin() && sorted.length > 1) {
      let corsPreFlightRequest = sorted[0];
      let mainRequest = findMainRequest(sorted, corsPreFlightRequest["responseEnd"], endTimeHR);
      const responseEnd = corsPreFlightRequest["responseEnd"];
      if (mainRequest["fetchStart"] < responseEnd) {
        mainRequest = corsPreFlightRequest;
        corsPreFlightRequest = void 0;
      }
      return {
        corsPreFlightRequest,
        mainRequest
      };
    } else return { mainRequest: filteredResources[0] };
  }
  function findMainRequest(resources, corsPreFlightRequestEndTime, spanEndTimeHR) {
    const spanEndTime = hrTimeToNanoseconds(spanEndTimeHR);
    const minTime = hrTimeToNanoseconds(timeInputToHrTime(corsPreFlightRequestEndTime));
    let mainRequest = resources[1];
    let bestGap;
    const length = resources.length;
    for (let i = 1; i < length; i++) {
      const resource = resources[i];
      const resourceStartTime = hrTimeToNanoseconds(timeInputToHrTime(resource["fetchStart"]));
      const currentGap = spanEndTime - hrTimeToNanoseconds(timeInputToHrTime(resource["responseEnd"]));
      if (resourceStartTime >= minTime && (!bestGap || currentGap < bestGap)) {
        bestGap = currentGap;
        mainRequest = resource;
      }
    }
    return mainRequest;
  }
  function filterResourcesForSpan(spanUrl, startTimeHR, endTimeHR, resources, ignoredResources, initiatorType) {
    const startTime = hrTimeToNanoseconds(startTimeHR);
    const endTime = hrTimeToNanoseconds(endTimeHR);
    let filteredResources = resources.filter((resource) => {
      const resourceStartTime = hrTimeToNanoseconds(timeInputToHrTime(resource["fetchStart"]));
      const resourceEndTime = hrTimeToNanoseconds(timeInputToHrTime(resource["responseEnd"]));
      return resource.initiatorType.toLowerCase() === (initiatorType || "xmlhttprequest") && resource.name === spanUrl && resourceStartTime >= startTime && resourceEndTime <= endTime;
    });
    if (filteredResources.length > 0) filteredResources = filteredResources.filter((resource) => {
      return !ignoredResources.has(resource);
    });
    return filteredResources;
  }
  function parseUrl(url) {
    if (typeof URL === "function") return new URL(url, typeof document !== "undefined" ? document.baseURI : typeof location !== "undefined" ? location.href : void 0);
    const element = getUrlNormalizingAnchor();
    element.href = url;
    return element;
  }
  function shouldPropagateTraceHeaders(spanUrl, propagateTraceHeaderCorsUrls) {
    let propagateTraceHeaderUrls = propagateTraceHeaderCorsUrls || [];
    if (typeof propagateTraceHeaderUrls === "string" || propagateTraceHeaderUrls instanceof RegExp) propagateTraceHeaderUrls = [propagateTraceHeaderUrls];
    if (parseUrl(spanUrl).origin === getOrigin()) return true;
    else return propagateTraceHeaderUrls.some((propagateTraceHeaderUrl) => urlMatches(spanUrl, propagateTraceHeaderUrl));
  }

  // node_modules/@opentelemetry/instrumentation-fetch/dist/fetch.mjs
  var OBSERVER_WAIT_TIME_MS = 300;
  var hasBrowserPerformanceAPI = typeof PerformanceObserver !== "undefined";
  var FetchInstrumentation = class extends InstrumentationBase {
    component = "fetch";
    version = VERSION5;
    moduleName = this.component;
    _usedResources = /* @__PURE__ */ new WeakSet();
    _tasksCount = 0;
    constructor(config = {}) {
      super("@opentelemetry/instrumentation-fetch", VERSION5, config);
    }
    init() {
    }
    /**
    * Add cors pre flight child span
    * @param span
    * @param corsPreFlightRequest
    */
    _addChildSpan(span, corsPreFlightRequest) {
      const childSpan = this.tracer.startSpan("CORS Preflight", { startTime: corsPreFlightRequest[PerformanceTimingNames.FETCH_START] }, trace.setSpan(context.active(), span));
      addSpanNetworkEvents(childSpan, corsPreFlightRequest, this.getConfig().ignoreNetworkEvents, void 0);
      childSpan.end(corsPreFlightRequest[PerformanceTimingNames.RESPONSE_END]);
    }
    /**
    * Adds more attributes to span just before ending it
    * @param span
    * @param response
    */
    _addFinalSpanAttributes(span, response) {
      const parsedUrl = parseUrl(response.url);
      span.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, response.status);
      span.setAttribute(ATTR_SERVER_ADDRESS, parsedUrl.hostname);
      const serverPort = serverPortFromUrl(parsedUrl);
      if (serverPort) span.setAttribute(ATTR_SERVER_PORT, serverPort);
    }
    /**
    * Add headers
    * @param options
    * @param spanUrl
    */
    _addHeaders(options, spanUrl) {
      if (!shouldPropagateTraceHeaders(spanUrl, this.getConfig().propagateTraceHeaderCorsUrls)) {
        const headers = {};
        propagation.inject(context.active(), headers);
        if (Object.keys(headers).length > 0) this._diag.debug("headers inject skipped due to CORS policy");
        return;
      }
      if (options instanceof Request) propagation.inject(context.active(), options.headers, { set: (h, k, v) => h.set(k, typeof v === "string" ? v : String(v)) });
      else {
        const headers = new Headers(options.headers);
        propagation.inject(context.active(), headers, { set: (h, k, v) => h.set(k, typeof v === "string" ? v : String(v)) });
        options.headers = headers;
      }
    }
    /**
    * Clears the resource timings and all resources assigned with spans
    *     when {@link FetchPluginConfig.clearTimingResources} is
    *     set to true (default false)
    * @private
    */
    _clearResources() {
      if (this._tasksCount === 0 && this.getConfig().clearTimingResources) {
        performance.clearResourceTimings();
        this._usedResources = /* @__PURE__ */ new WeakSet();
      }
    }
    /**
    * Creates a new span
    * @param url
    * @param options
    */
    _createSpan(url, options = {}) {
      if (isUrlIgnored(url, this.getConfig().ignoreUrls)) {
        this._diag.debug("ignoring span as url matches ignored url");
        return;
      }
      const attributes = {};
      const origMethod = options.method;
      const normMethod = normalizeHttpRequestMethod(options.method || "GET");
      const name = normMethod;
      attributes[ATTR_HTTP_REQUEST_METHOD] = normMethod;
      if (normMethod !== origMethod) attributes[ATTR_HTTP_REQUEST_METHOD_ORIGINAL] = origMethod;
      attributes[ATTR_URL_FULL] = redactUrl(url);
      return this.tracer.startSpan(name, {
        kind: SpanKind.CLIENT,
        attributes
      });
    }
    /**
    * Finds appropriate resource and add network events to the span
    * @param span
    * @param resourcesObserver
    * @param endTime
    */
    _findResourceAndAddNetworkEvents(span, resourcesObserver, endTime) {
      let resources = resourcesObserver.entries;
      if (!resources.length) {
        if (!performance.getEntriesByType) return;
        resources = performance.getEntriesByType("resource");
      }
      const resource = getResource(resourcesObserver.spanUrl, resourcesObserver.startTime, endTime, resources, this._usedResources, "fetch");
      if (resource.mainRequest) {
        const mainRequest = resource.mainRequest;
        this._markResourceAsUsed(mainRequest);
        const corsPreFlightRequest = resource.corsPreFlightRequest;
        if (corsPreFlightRequest) {
          this._addChildSpan(span, corsPreFlightRequest);
          this._markResourceAsUsed(corsPreFlightRequest);
        }
        addSpanNetworkEvents(span, mainRequest, this.getConfig().ignoreNetworkEvents, void 0);
      }
    }
    /**
    * Marks certain [resource]{@link PerformanceResourceTiming} when information
    * from this is used to add events to span.
    * This is done to avoid reusing the same resource again for next span
    * @param resource
    */
    _markResourceAsUsed(resource) {
      this._usedResources.add(resource);
    }
    /**
    * Finish span, add attributes, network events etc.
    * @param span
    * @param spanData
    * @param response
    */
    _endSpan(span, spanData, response) {
      const endTime = millisToHrTime(Date.now());
      const performanceEndTime = hrTime();
      this._addFinalSpanAttributes(span, response);
      if (response.status >= 400) {
        span.setStatus({ code: SpanStatusCode.ERROR });
        span.setAttribute(ATTR_ERROR_TYPE, String(response.status));
      }
      setTimeout(() => {
        spanData.observer?.disconnect();
        this._findResourceAndAddNetworkEvents(span, spanData, performanceEndTime);
        this._tasksCount--;
        this._clearResources();
        span.end(endTime);
      }, OBSERVER_WAIT_TIME_MS);
    }
    /**
    * Patches the constructor of fetch
    */
    _patchConstructor() {
      return (original) => {
        const plugin = this;
        return function patchConstructor(...args) {
          if (!plugin._enabled) return original.apply(this, args);
          const self2 = this;
          const url = parseUrl(args[0] instanceof Request ? args[0].url : String(args[0])).href;
          let options;
          if (args[0] instanceof Request) options = args[1] != null ? new Request(args[0], args[1]) : args[0];
          else options = args[1] || {};
          const createdSpan = plugin._createSpan(url, options);
          if (!createdSpan) return original.apply(this, args);
          const spanData = plugin._prepareSpanData(url);
          if (plugin.getConfig().measureRequestSize) getFetchBodyLength(...args).then((bodyLength) => {
            if (!bodyLength) return;
            createdSpan.setAttribute(ATTR_HTTP_REQUEST_BODY_SIZE, bodyLength);
          }).catch((error) => {
            plugin._diag.warn("getFetchBodyLength", error);
          });
          function endSpanOnError(span, error) {
            plugin._applyAttributesAfterFetch(span, options, error);
            plugin._endSpan(span, spanData, {
              status: error.status || 0,
              statusText: error.message,
              url
            });
          }
          function endSpanOnSuccess(span, response) {
            plugin._applyAttributesAfterFetch(span, options, response);
            if (response.status >= 200 && response.status < 400) plugin._endSpan(span, spanData, response);
            else plugin._endSpan(span, spanData, {
              status: response.status,
              statusText: response.statusText,
              url
            });
          }
          function onSuccess(span, response) {
            try {
              const body = response.clone().body;
              if (body) {
                const reader = body.getReader();
                const read = () => {
                  reader.read().then(({ done }) => {
                    if (done) endSpanOnSuccess(span, response);
                    else read();
                  }, (error) => {
                    endSpanOnError(span, error);
                  });
                };
                read();
              } else endSpanOnSuccess(span, response);
            } catch (error) {
              plugin._diag.error("Failed to read fetch response body", error);
              plugin._endSpan(span, spanData, {
                status: 0,
                url
              });
            }
            return response;
          }
          function onError(span, error) {
            try {
              endSpanOnError(span, error);
            } catch (e) {
              plugin._diag.error("Failed to end span on fetch error", e);
              plugin._endSpan(span, spanData, {
                status: error.status || 0,
                url
              });
            }
            throw error;
          }
          return context.with(trace.setSpan(context.active(), createdSpan), () => {
            plugin._callRequestHook(createdSpan, options);
            plugin._addHeaders(options, url);
            plugin._tasksCount++;
            return original.apply(self2, options instanceof Request ? [options] : [url, options]).then(onSuccess.bind(self2, createdSpan), onError.bind(self2, createdSpan));
          });
        };
      };
    }
    _applyAttributesAfterFetch(span, request, result) {
      const applyCustomAttributesOnSpan = this.getConfig().applyCustomAttributesOnSpan;
      if (applyCustomAttributesOnSpan) safeExecuteInTheMiddle(() => applyCustomAttributesOnSpan(span, request, result), (error) => {
        if (!error) return;
        this._diag.error("applyCustomAttributesOnSpan", error);
      }, true);
    }
    _callRequestHook(span, request) {
      const requestHook = this.getConfig().requestHook;
      if (requestHook) safeExecuteInTheMiddle(() => requestHook(span, request), (error) => {
        if (!error) return;
        this._diag.error("requestHook", error);
      }, true);
    }
    /**
    * Prepares a span data - needed later for matching appropriate network
    *     resources
    * @param spanUrl
    */
    _prepareSpanData(spanUrl) {
      const startTime = hrTime();
      const entries = [];
      if (typeof PerformanceObserver !== "function") return {
        entries,
        startTime,
        spanUrl
      };
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.initiatorType === "fetch" && entry.name === spanUrl) entries.push(entry);
        });
      });
      observer.observe({ entryTypes: ["resource"] });
      return {
        entries,
        observer,
        startTime,
        spanUrl
      };
    }
    /**
    * implements enable function
    */
    enable() {
      if (!hasBrowserPerformanceAPI) {
        this._diag.warn("this instrumentation is intended for web usage only, it does not instrument server-side fetch()");
        return;
      }
      if (this._enabled) return;
      if (this._isFetchPatched) {
        this._diag.debug("fetch constructor already patched");
        this._enabled = true;
        return;
      }
      if (typeof globalThis.fetch !== "function") {
        this._diag.warn("globalThis.fetch is missing or not a function; instrumentation will not be enabled. Register the instrumentation after any fetch polyfill, or call enable() once fetch is available.");
        return;
      }
      try {
        this._wrap(globalThis, "fetch", this._patchConstructor());
        this._isFetchPatched = true;
        this._enabled = true;
      } catch (err) {
        this._diag.warn("Failed to patch globalThis.fetch; instrumentation will not be enabled. Another script may have locked globalThis.fetch via Object.defineProperty.", err);
      }
    }
    /**
    * deactivates fetch instrumentation
    */
    disable() {
      if (!hasBrowserPerformanceAPI) return;
      if (!this._enabled) return;
      this._enabled = false;
      this._usedResources = /* @__PURE__ */ new WeakSet();
    }
  };

  // node_modules/@opentelemetry/sdk-trace/dist/StackContextManager.mjs
  var StackContextManager = class {
    /**
    * whether the context manager is enabled or not
    */
    _enabled = false;
    /**
    * Keeps the reference to current context
    */
    _currentContext = ROOT_CONTEXT;
    /**
    *
    * @param context
    * @param target Function to be executed within the context
    */
    _bindFunction(context2 = ROOT_CONTEXT, target) {
      const manager = this;
      const contextWrapper = function(...args) {
        return manager.with(context2, () => target.apply(this, args));
      };
      Object.defineProperty(contextWrapper, "length", {
        enumerable: false,
        configurable: true,
        writable: false,
        value: target.length
      });
      return contextWrapper;
    }
    /**
    * Returns the active context
    */
    active() {
      return this._currentContext;
    }
    /**
    * Binds a the certain context or the active one to the target function and then returns the target
    * @param context A context (span) to be bind to target
    * @param target a function or event emitter. When target or one of its callbacks is called,
    *  the provided context will be used as the active context for the duration of the call.
    */
    bind(context2, target) {
      if (context2 === void 0) context2 = this.active();
      if (typeof target === "function") return this._bindFunction(context2, target);
      return target;
    }
    /**
    * Disable the context manager (clears the current context)
    */
    disable() {
      this._currentContext = ROOT_CONTEXT;
      this._enabled = false;
      return this;
    }
    /**
    * Enables the context manager and creates a default(root) context
    */
    enable() {
      if (this._enabled) return this;
      this._enabled = true;
      this._currentContext = ROOT_CONTEXT;
      return this;
    }
    /**
    * Calls the callback function [fn] with the provided [context]. If [context] is undefined then it will use the window.
    * The context will be set as active
    * @param context
    * @param fn Callback function
    * @param thisArg optional receiver to be used for calling fn
    * @param args optional arguments forwarded to fn
    */
    with(context2, fn, thisArg, ...args) {
      const previousContext = this._currentContext;
      this._currentContext = context2 || ROOT_CONTEXT;
      try {
        return fn.call(thisArg, ...args);
      } finally {
        this._currentContext = previousContext;
      }
    }
  };

  // node_modules/@opentelemetry/sdk-trace/dist/sampler/AlwaysOffSampler.mjs
  var AlwaysOffSampler = class {
    shouldSample() {
      return { decision: 0 };
    }
    toString() {
      return "AlwaysOffSampler";
    }
  };

  // node_modules/@opentelemetry/sdk-trace/dist/sampler/AlwaysOnSampler.mjs
  var AlwaysOnSampler = class {
    shouldSample() {
      return { decision: 2 };
    }
    toString() {
      return "AlwaysOnSampler";
    }
  };

  // node_modules/@opentelemetry/sdk-trace/dist/sampler/ParentBasedSampler.mjs
  var ParentBasedSampler = class {
    _root;
    _remoteParentSampled;
    _remoteParentNotSampled;
    _localParentSampled;
    _localParentNotSampled;
    constructor(config) {
      this._root = config.root;
      if (!this._root) {
        globalErrorHandler(/* @__PURE__ */ new Error("ParentBasedSampler must have a root sampler configured"));
        this._root = new AlwaysOnSampler();
      }
      this._remoteParentSampled = config.remoteParentSampled ?? new AlwaysOnSampler();
      this._remoteParentNotSampled = config.remoteParentNotSampled ?? new AlwaysOffSampler();
      this._localParentSampled = config.localParentSampled ?? new AlwaysOnSampler();
      this._localParentNotSampled = config.localParentNotSampled ?? new AlwaysOffSampler();
    }
    shouldSample(context2, traceId, spanName, spanKind, attributes, links) {
      const parentContext = trace.getSpanContext(context2);
      if (!parentContext || !isSpanContextValid(parentContext)) return this._root.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
      if (parentContext.isRemote) {
        if (parentContext.traceFlags & TraceFlags.SAMPLED) return this._remoteParentSampled.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
        return this._remoteParentNotSampled.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
      }
      if (parentContext.traceFlags & TraceFlags.SAMPLED) return this._localParentSampled.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
      return this._localParentNotSampled.shouldSample(context2, traceId, spanName, spanKind, attributes, links);
    }
    toString() {
      return `ParentBased{root=${this._root.toString()}, remoteParentSampled=${this._remoteParentSampled.toString()}, remoteParentNotSampled=${this._remoteParentNotSampled.toString()}, localParentSampled=${this._localParentSampled.toString()}, localParentNotSampled=${this._localParentNotSampled.toString()}}`;
    }
  };

  // node_modules/@opentelemetry/sdk-trace/dist/inspect.mjs
  var inspectCustom = /* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom");
  function settledResourceAttributes(resource) {
    const attrs = {};
    for (const [k, v] of resource.getRawAttributes()) {
      if (typeof v?.then === "function") continue;
      if (v != null) attrs[k] ??= v;
    }
    return attrs;
  }
  function formatInspect(className, payload, depth, options, inspect) {
    if (typeof depth === "number" && depth < 0) {
      const tag = `[${className}]`;
      return options?.stylize ? options.stylize(tag, "special") : tag;
    }
    if (typeof inspect !== "function" || !options) return payload;
    return `${className} ${inspect(payload, {
      ...options,
      depth: options.depth == null ? options.depth : options.depth - 1
    })}`;
  }

  // node_modules/@opentelemetry/sdk-trace/dist/enums.mjs
  var ExceptionEventName = "exception";

  // node_modules/@opentelemetry/sdk-trace/dist/Span.mjs
  var SpanImpl = class {
    _spanContext;
    kind;
    parentSpanContext;
    attributes;
    links = [];
    events = [];
    startTime;
    resource;
    instrumentationScope;
    _droppedAttributesCount = 0;
    _droppedEventsCount = 0;
    _droppedLinksCount = 0;
    _attributesCount = 0;
    name;
    status = { code: SpanStatusCode.UNSET };
    endTime = [0, 0];
    _ended = false;
    _duration = [-1, -1];
    _spanProcessor;
    _spanLimits;
    _recordEndMetrics;
    _performanceStartTime;
    _performanceOffset;
    _startTimeProvided;
    /**
    * Constructs a new SpanImpl instance.
    *
    * `opts.attributes` must already have been sanitized by caller.
    * `attributes` in `opts.links` must already have been sanitized by caller.
    * These are typically required anyway to pass sanitized details to a
    * *sampler* before span creation.
    */
    constructor(opts) {
      const now = Date.now();
      this._spanContext = opts.spanContext;
      this._performanceStartTime = performance.now();
      this._performanceOffset = now - (this._performanceStartTime + performance.timeOrigin);
      this._startTimeProvided = opts.startTime != null;
      this._spanLimits = opts.spanLimits;
      this._spanProcessor = opts.spanProcessor;
      this.name = opts.name;
      this.parentSpanContext = opts.parentSpanContext;
      this.kind = opts.kind;
      this.startTime = this._getTime(opts.startTime ?? now);
      this.resource = opts.resource;
      this.instrumentationScope = opts.scope;
      this._recordEndMetrics = opts.recordEndMetrics;
      if (opts.links) {
        const { linkCountLimit } = this._spanLimits;
        if (opts.links.length > linkCountLimit) {
          this.links = opts.links.slice(opts.links.length - linkCountLimit, opts.links.length);
          this._droppedLinksCount = opts.links.length - linkCountLimit;
        } else {
          this.links = opts.links;
          this._droppedLinksCount = 0;
        }
      }
      this.attributes = opts.attributes ?? {};
      this._attributesCount = Object.keys(this.attributes).length;
      this._droppedAttributesCount = opts.droppedAttributesCount ?? 0;
      this._spanProcessor.onStart(this, opts.context);
    }
    spanContext() {
      return this._spanContext;
    }
    setAttribute(key, value) {
      if (this._isSpanEnded()) return this;
      const decision = maybeAddAttribute({
        key,
        value,
        attributes: this.attributes,
        limits: this._spanLimits,
        currentAttributesCount: this._attributesCount
      });
      if (decision === AddAttributeDecision.DROP_LIMIT_REACHED) {
        this._droppedAttributesCount++;
        if (this._droppedAttributesCount === 1) diag2.warn("Dropping extra attributes.");
      } else if (decision === AddAttributeDecision.ADD_NEW) this._attributesCount++;
      return this;
    }
    setAttributes(attributes) {
      for (const key in attributes) if (Object.prototype.hasOwnProperty.call(attributes, key)) this.setAttribute(key, attributes[key]);
      return this;
    }
    /**
    *
    * @param name Span event name
    * @param [attributesOrStartTime] Attributes or start time
    *     if type is {@type TimeInput} and 3rd param is undefined.
    *     Only "simple" value types are supported for span event attributes
    *     (string, number, boolean, homogeneous array of these primitive types).
    *     See OTEP 4485 and `cleanSimpleAttributes()` in `@opentelemetry/core`.
    * @param [timeStamp] Specified time stamp for the event
    */
    addEvent(name, attributesOrStartTime, timeStamp) {
      if (this._isSpanEnded()) return this;
      const { eventCountLimit } = this._spanLimits;
      if (eventCountLimit === 0) {
        diag2.warn("No events allowed.");
        this._droppedEventsCount++;
        return this;
      }
      if (eventCountLimit !== void 0 && this.events.length >= eventCountLimit) {
        if (this._droppedEventsCount === 0) diag2.debug("Dropping extra events.");
        this.events.shift();
        this._droppedEventsCount++;
      }
      if (isTimeInput(attributesOrStartTime)) {
        if (!isTimeInput(timeStamp)) timeStamp = attributesOrStartTime;
        attributesOrStartTime = void 0;
      }
      this.events.push({
        name,
        time: this._getTime(timeStamp),
        ...cleanSimpleAttributes(attributesOrStartTime, {
          attributeCountLimit: this._spanLimits.attributePerEventCountLimit,
          attributeValueLengthLimit: this._spanLimits.attributeValueLengthLimit
        })
      });
      return this;
    }
    addLink(link) {
      if (this._isSpanEnded()) return this;
      const { linkCountLimit } = this._spanLimits;
      if (linkCountLimit === 0) {
        this._droppedLinksCount++;
        return this;
      }
      if (linkCountLimit !== void 0 && this.links.length >= linkCountLimit) {
        if (this._droppedLinksCount === 0) diag2.debug("Dropping extra links.");
        this.links.shift();
        this._droppedLinksCount++;
      }
      this.links.push({
        context: link.context,
        ...cleanAttributes(link.attributes, {
          attributeCountLimit: this._spanLimits.attributePerLinkCountLimit,
          attributeValueLengthLimit: this._spanLimits.attributeValueLengthLimit
        })
      });
      return this;
    }
    addLinks(links) {
      for (const link of links) this.addLink(link);
      return this;
    }
    setStatus(status) {
      if (this._isSpanEnded()) return this;
      if (status.code === SpanStatusCode.UNSET) return this;
      if (this.status.code === SpanStatusCode.OK) return this;
      const newStatus = { code: status.code };
      if (status.code === SpanStatusCode.ERROR) {
        if (typeof status.message === "string") newStatus.message = status.message;
        else if (status.message != null) diag2.warn(`Dropping invalid status.message of type '${typeof status.message}', expected 'string'`);
      }
      this.status = newStatus;
      return this;
    }
    updateName(name) {
      if (this._isSpanEnded()) return this;
      this.name = name;
      return this;
    }
    end(endTime) {
      if (this._isSpanEnded()) {
        diag2.error(`${this.name} ${this._spanContext.traceId}-${this._spanContext.spanId} - You can only call end() on a span once.`);
        return;
      }
      this.endTime = this._getTime(endTime);
      this._duration = hrTimeDuration(this.startTime, this.endTime);
      if (this._duration[0] < 0) {
        diag2.warn("Inconsistent start and end time, startTime > endTime. Setting span duration to 0ms.", this.startTime, this.endTime);
        this.endTime = this.startTime.slice();
        this._duration = [0, 0];
      }
      if (this._droppedEventsCount > 0) diag2.warn(`Dropped ${this._droppedEventsCount} events because eventCountLimit reached`);
      if (this._droppedLinksCount > 0) diag2.warn(`Dropped ${this._droppedLinksCount} links because linkCountLimit reached`);
      if (this._spanProcessor.onEnding) this._spanProcessor.onEnding(this);
      this._recordEndMetrics?.();
      this._ended = true;
      this._spanProcessor.onEnd(this);
    }
    _getTime(inp) {
      if (typeof inp === "number" && inp <= performance.now()) return hrTime(inp + this._performanceOffset);
      if (typeof inp === "number") return millisToHrTime(inp);
      if (inp instanceof Date) return millisToHrTime(inp.getTime());
      if (isTimeInputHrTime(inp)) return inp;
      if (this._startTimeProvided) return millisToHrTime(Date.now());
      const msDuration = performance.now() - this._performanceStartTime;
      return addHrTimes(this.startTime, millisToHrTime(msDuration));
    }
    isRecording() {
      return this._ended === false;
    }
    recordException(exception, time) {
      const attributes = {};
      if (typeof exception === "string") attributes[ATTR_EXCEPTION_MESSAGE] = exception;
      else if (exception) {
        if (exception.code) attributes[ATTR_EXCEPTION_TYPE] = exception.code.toString();
        else if (exception.name) attributes[ATTR_EXCEPTION_TYPE] = exception.name;
        if (exception.message) attributes[ATTR_EXCEPTION_MESSAGE] = exception.message;
        if (exception.stack) attributes[ATTR_EXCEPTION_STACKTRACE] = exception.stack;
      }
      if (attributes[ATTR_EXCEPTION_TYPE] || attributes[ATTR_EXCEPTION_MESSAGE]) this.addEvent(ExceptionEventName, attributes, time);
      else diag2.warn(`Failed to record an exception ${exception}`);
    }
    get duration() {
      return this._duration;
    }
    get ended() {
      return this._ended;
    }
    get droppedAttributesCount() {
      return this._droppedAttributesCount;
    }
    get droppedEventsCount() {
      return this._droppedEventsCount;
    }
    get droppedLinksCount() {
      return this._droppedLinksCount;
    }
    _isSpanEnded() {
      if (this._ended) {
        const error = /* @__PURE__ */ new Error(`Operation attempted on ended Span {traceId: ${this._spanContext.traceId}, spanId: ${this._spanContext.spanId}}`);
        diag2.warn(`Cannot execute the operation on ended Span {traceId: ${this._spanContext.traceId}, spanId: ${this._spanContext.spanId}}`, error);
      }
      return this._ended;
    }
    [inspectCustom](depth, options, inspect) {
      const payload = {
        name: this.name,
        kind: this.kind,
        spanContext: this._spanContext,
        parentSpanContext: this.parentSpanContext,
        status: this.status,
        startTime: this.startTime,
        endTime: this.endTime,
        duration: this._duration,
        ended: this._ended,
        attributes: this.attributes,
        events: this.events,
        links: this.links,
        droppedAttributesCount: this._droppedAttributesCount,
        droppedEventsCount: this._droppedEventsCount,
        droppedLinksCount: this._droppedLinksCount,
        instrumentationScope: this.instrumentationScope,
        resource: { attributes: settledResourceAttributes(this.resource) }
      };
      return formatInspect("SpanImpl", payload, depth, options, inspect);
    }
  };

  // node_modules/@opentelemetry/sdk-trace/dist/semconv.mjs
  var ATTR_OTEL_COMPONENT_NAME2 = "otel.component.name";
  var ATTR_OTEL_COMPONENT_TYPE2 = "otel.component.type";
  var ATTR_OTEL_SPAN_PARENT_ORIGIN = "otel.span.parent.origin";
  var ATTR_OTEL_SPAN_SAMPLING_RESULT = "otel.span.sampling_result";
  var METRIC_OTEL_SDK_PROCESSOR_SPAN_PROCESSED = "otel.sdk.processor.span.processed";
  var METRIC_OTEL_SDK_PROCESSOR_SPAN_QUEUE_CAPACITY = "otel.sdk.processor.span.queue.capacity";
  var METRIC_OTEL_SDK_PROCESSOR_SPAN_QUEUE_SIZE = "otel.sdk.processor.span.queue.size";
  var METRIC_OTEL_SDK_SPAN_LIVE = "otel.sdk.span.live";
  var METRIC_OTEL_SDK_SPAN_STARTED = "otel.sdk.span.started";
  var OTEL_COMPONENT_TYPE_VALUE_BATCHING_SPAN_PROCESSOR = "batching_span_processor";

  // node_modules/@opentelemetry/sdk-trace/dist/TracerMetrics.mjs
  var TracerMetrics = class {
    startedSpans;
    liveSpans;
    constructor(meter) {
      this.startedSpans = meter.createCounter(METRIC_OTEL_SDK_SPAN_STARTED, {
        unit: "{span}",
        description: "The number of created spans."
      });
      this.liveSpans = meter.createUpDownCounter(METRIC_OTEL_SDK_SPAN_LIVE, {
        unit: "{span}",
        description: "The number of currently live spans."
      });
    }
    startSpan(parentSpanCtx, samplingDecision) {
      const samplingDecisionStr = samplingDecisionToString(samplingDecision);
      this.startedSpans.add(1, {
        [ATTR_OTEL_SPAN_PARENT_ORIGIN]: parentOrigin(parentSpanCtx),
        [ATTR_OTEL_SPAN_SAMPLING_RESULT]: samplingDecisionStr
      });
      if (samplingDecision === 0) return () => {
      };
      const liveSpanAttributes = { [ATTR_OTEL_SPAN_SAMPLING_RESULT]: samplingDecisionStr };
      this.liveSpans.add(1, liveSpanAttributes);
      return () => {
        this.liveSpans.add(-1, liveSpanAttributes);
      };
    }
  };
  function parentOrigin(parentSpanContext) {
    if (!parentSpanContext) return "none";
    if (parentSpanContext.isRemote) return "remote";
    return "local";
  }
  function samplingDecisionToString(decision) {
    switch (decision) {
      case 2:
        return "RECORD_AND_SAMPLE";
      case 1:
        return "RECORD_ONLY";
      case 0:
        return "DROP";
    }
  }

  // node_modules/@opentelemetry/sdk-trace/dist/version.mjs
  var VERSION6 = "3.1.1";

  // node_modules/@opentelemetry/sdk-trace/dist/Tracer.mjs
  var NO_ATTR_LIMITS = {
    attributeCountLimit: Infinity,
    attributeValueLengthLimit: Infinity
  };
  var Tracer$1 = class {
    _sampler;
    _spanLimits;
    _idGenerator;
    instrumentationScope;
    _resource;
    _spanProcessor;
    _tracerMetrics;
    /**
    * Constructs a new Tracer instance.
    */
    constructor(instrumentationScope, options) {
      this.instrumentationScope = instrumentationScope;
      this._sampler = options.sampler;
      this._spanLimits = options.spanLimits;
      this._resource = options.resource;
      this._idGenerator = options.idGenerator;
      this._spanProcessor = options.spanProcessor;
      const meter = options.meterProvider.getMeter("@opentelemetry/sdk-trace", VERSION6);
      this._tracerMetrics = new TracerMetrics(meter);
    }
    /**
    * Starts a new Span or returns the default NoopSpan based on the sampling
    * decision.
    */
    startSpan(name, options = {}, context2 = context.active()) {
      if (options.root) context2 = trace.deleteSpan(context2);
      const parentSpan = trace.getSpan(context2);
      if (isTracingSuppressed(context2)) {
        diag2.debug("Instrumentation suppressed, returning Noop Span");
        return trace.wrapSpanContext(INVALID_SPAN_CONTEXT);
      }
      const parentSpanContext = parentSpan?.spanContext();
      const spanId = this._idGenerator.generateSpanId();
      let validParentSpanContext;
      let traceId;
      let traceState;
      if (!parentSpanContext || !trace.isSpanContextValid(parentSpanContext)) traceId = this._idGenerator.generateTraceId();
      else {
        traceId = parentSpanContext.traceId;
        traceState = parentSpanContext.traceState;
        validParentSpanContext = parentSpanContext;
      }
      const spanKind = options.kind ?? SpanKind.INTERNAL;
      const links = (options.links ?? []).map((link) => {
        return {
          context: link.context,
          ...cleanAttributes(link.attributes, {
            attributeCountLimit: this._spanLimits.attributePerLinkCountLimit,
            attributeValueLengthLimit: this._spanLimits.attributeValueLengthLimit
          })
        };
      });
      const attrsData1 = cleanAttributes(options.attributes, NO_ATTR_LIMITS);
      const attributes = attrsData1.attributes ?? {};
      const samplingResult = this._sampler.shouldSample(context2, traceId, name, spanKind, attributes, links);
      const recordEndMetrics = this._tracerMetrics.startSpan(parentSpanContext, samplingResult.decision);
      traceState = samplingResult.traceState ?? traceState;
      const traceFlags = samplingResult.decision === SamplingDecision.RECORD_AND_SAMPLED ? TraceFlags.SAMPLED : TraceFlags.NONE;
      const spanContext = {
        traceId,
        spanId,
        traceFlags,
        traceState
      };
      if (samplingResult.decision === SamplingDecision.NOT_RECORD) {
        diag2.debug("Recording is off, propagating context in a non-recording span");
        return trace.wrapSpanContext(spanContext);
      }
      const attrsData2 = cleanAttributes(Object.assign(attributes, samplingResult.attributes), this._spanLimits);
      return new SpanImpl({
        resource: this._resource,
        scope: this.instrumentationScope,
        context: context2,
        spanContext,
        name,
        kind: spanKind,
        links,
        parentSpanContext: validParentSpanContext,
        attributes: attrsData2.attributes,
        droppedAttributesCount: (attrsData1.droppedAttributesCount ?? 0) + (attrsData2.droppedAttributesCount ?? 0),
        startTime: options.startTime,
        spanProcessor: this._spanProcessor,
        spanLimits: this._spanLimits,
        recordEndMetrics
      });
    }
    startActiveSpan(name, arg2, arg3, arg4) {
      let opts;
      let ctx;
      let fn;
      if (arguments.length < 2) return;
      else if (arguments.length === 2) fn = arg2;
      else if (arguments.length === 3) {
        opts = arg2;
        fn = arg3;
      } else {
        opts = arg2;
        ctx = arg3;
        fn = arg4;
      }
      const parentContext = ctx ?? context.active();
      const span = this.startSpan(name, opts, parentContext);
      const contextWithSpanSet = trace.setSpan(parentContext, span);
      return context.with(contextWithSpanSet, fn, void 0, span);
    }
    [inspectCustom](depth, options, inspect) {
      const payload = {
        instrumentationScope: this.instrumentationScope,
        resource: { attributes: settledResourceAttributes(this._resource) },
        spanLimits: this._spanLimits
      };
      return formatInspect("Tracer", payload, depth, options, inspect);
    }
  };

  // node_modules/@opentelemetry/sdk-trace/dist/MultiSpanProcessor.mjs
  var MultiSpanProcessor = class {
    _spanProcessors;
    constructor(spanProcessors) {
      this._spanProcessors = spanProcessors;
    }
    forceFlush() {
      const promises = [];
      for (const spanProcessor of this._spanProcessors) promises.push(spanProcessor.forceFlush());
      return new Promise((resolve) => {
        Promise.all(promises).then(() => {
          resolve();
        }).catch((error) => {
          globalErrorHandler(error || /* @__PURE__ */ new Error("MultiSpanProcessor: forceFlush failed"));
          resolve();
        });
      });
    }
    onStart(span, context2) {
      for (const spanProcessor of this._spanProcessors) spanProcessor.onStart(span, context2);
    }
    onEnding(span) {
      for (const spanProcessor of this._spanProcessors) if (spanProcessor.onEnding) spanProcessor.onEnding(span);
    }
    onEnd(span) {
      for (const spanProcessor of this._spanProcessors) spanProcessor.onEnd(span);
    }
    shutdown() {
      const promises = [];
      for (const spanProcessor of this._spanProcessors) promises.push(spanProcessor.shutdown());
      return new Promise((resolve, reject) => {
        Promise.all(promises).then(() => {
          resolve();
        }, reject);
      });
    }
  };

  // node_modules/@opentelemetry/sdk-trace/dist/export/SpanProcessorMetrics.mjs
  var componentCounter2 = /* @__PURE__ */ new Map();
  var SpanProcessorMetrics = class {
    processedSpans;
    queueSize;
    queueSizeCallback;
    standardAttrs;
    droppedAttrs;
    constructor(componentType, meter, queueConfig) {
      const counter = componentCounter2.get(componentType) ?? 0;
      componentCounter2.set(componentType, counter + 1);
      this.standardAttrs = {
        [ATTR_OTEL_COMPONENT_TYPE2]: componentType,
        [ATTR_OTEL_COMPONENT_NAME2]: `${componentType}/${counter}`
      };
      this.droppedAttrs = {
        ...this.standardAttrs,
        [ATTR_ERROR_TYPE]: "queue_full"
      };
      this.processedSpans = meter.createCounter(METRIC_OTEL_SDK_PROCESSOR_SPAN_PROCESSED, {
        unit: "{span}",
        description: "The number of spans for which the processing has finished, either successful or failed."
      });
      if (queueConfig) {
        const { capacity, getQueueSize } = queueConfig;
        meter.createUpDownCounter(METRIC_OTEL_SDK_PROCESSOR_SPAN_QUEUE_CAPACITY, {
          unit: "{span}",
          description: "The maximum number of spans the queue of a given instance of an SDK span processor can hold."
        }).add(capacity, this.standardAttrs);
        this.queueSize = meter.createObservableUpDownCounter(METRIC_OTEL_SDK_PROCESSOR_SPAN_QUEUE_SIZE, {
          unit: "{span}",
          description: "The number of spans in the queue of a given instance of an SDK span processor."
        });
        this.queueSizeCallback = (result) => result.observe(getQueueSize(), this.standardAttrs);
        this.queueSize.addCallback(this.queueSizeCallback);
      }
    }
    dropSpans(count) {
      this.processedSpans.add(count, this.droppedAttrs);
    }
    finishSpans(count, error) {
      if (!error) {
        this.processedSpans.add(count, this.standardAttrs);
        return;
      }
      const attrs = {
        ...this.standardAttrs,
        [ATTR_ERROR_TYPE]: error.name
      };
      this.processedSpans.add(count, attrs);
    }
    shutdown() {
      if (this.queueSize && this.queueSizeCallback) this.queueSize.removeCallback(this.queueSizeCallback);
    }
  };

  // node_modules/@opentelemetry/sdk-trace/dist/export/BatchSpanProcessorBase.mjs
  var BatchSpanProcessorBase = class {
    _maxExportBatchSize;
    _maxQueueSize;
    _scheduledDelayMillis;
    _exportTimeoutMillis;
    _exporter;
    _metrics;
    _isExporting = false;
    _finishedSpans = [];
    _timer;
    _shutdownOnce;
    _droppedSpansCount = 0;
    constructor(options) {
      this._exporter = options.exporter;
      this._maxExportBatchSize = options.maxExportBatchSize ?? 512;
      this._maxQueueSize = options.maxQueueSize ?? 2048;
      this._scheduledDelayMillis = options.scheduledDelayMillis ?? 5e3;
      this._exportTimeoutMillis = options.exportTimeoutMillis ?? 3e4;
      this._shutdownOnce = new BindOnceFuture(this._shutdown, this);
      if (this._maxExportBatchSize > this._maxQueueSize) {
        diag2.warn("BatchSpanProcessor: maxExportBatchSize must be smaller or equal to maxQueueSize, setting maxExportBatchSize to match maxQueueSize");
        this._maxExportBatchSize = this._maxQueueSize;
      }
      const meter = options.selfObsMeterProvider ? options.selfObsMeterProvider.getMeter("@opentelemetry/sdk-trace") : createNoopMeter();
      this._metrics = new SpanProcessorMetrics(OTEL_COMPONENT_TYPE_VALUE_BATCHING_SPAN_PROCESSOR, meter, {
        capacity: this._maxQueueSize,
        getQueueSize: () => this._finishedSpans.length
      });
    }
    forceFlush() {
      if (this._shutdownOnce.isCalled) return this._shutdownOnce.promise;
      return this._flushAll();
    }
    onStart(_span, _parentContext) {
    }
    onEnd(span) {
      if (this._shutdownOnce.isCalled) return;
      if ((span.spanContext().traceFlags & TraceFlags.SAMPLED) === 0) return;
      this._addToBuffer(span);
    }
    shutdown() {
      return this._shutdownOnce.call();
    }
    _shutdown() {
      return Promise.resolve().then(() => {
        return this.onShutdown();
      }).then(() => {
        return this._flushAll();
      }).then(() => {
        this._metrics.shutdown();
        return this._exporter.shutdown();
      });
    }
    /** Add a span in the buffer. */
    _addToBuffer(span) {
      if (this._finishedSpans.length >= this._maxQueueSize) {
        if (this._droppedSpansCount === 0) diag2.debug("maxQueueSize reached, dropping spans");
        this._droppedSpansCount++;
        this._metrics.dropSpans(1);
        return;
      }
      if (this._droppedSpansCount > 0) {
        diag2.warn(`Dropped ${this._droppedSpansCount} spans because maxQueueSize reached`);
        this._droppedSpansCount = 0;
      }
      this._finishedSpans.push(span);
      this._maybeStartTimer();
    }
    /**
    * Send all spans to the exporter respecting the batch size limit
    * This function is used only on forceFlush or shutdown,
    * for all other cases _flush should be used
    * */
    _flushAll() {
      return new Promise((resolve, reject) => {
        const promises = [];
        const count = Math.ceil(this._finishedSpans.length / this._maxExportBatchSize);
        for (let i = 0, j = count; i < j; i++) promises.push(this._flushOneBatch());
        Promise.all(promises).then(() => {
          resolve();
        }).catch(reject);
      });
    }
    _flushOneBatch() {
      this._clearTimer();
      if (this._finishedSpans.length === 0) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(/* @__PURE__ */ new Error("Timeout"));
        }, this._exportTimeoutMillis);
        context.with(suppressTracing(context.active()), () => {
          let spans;
          if (this._finishedSpans.length <= this._maxExportBatchSize) {
            spans = this._finishedSpans;
            this._finishedSpans = [];
          } else spans = this._finishedSpans.splice(0, this._maxExportBatchSize);
          const doExport = () => this._exporter.export(spans, (result) => {
            clearTimeout(timer);
            this._metrics.finishSpans(spans.length, result.error);
            if (result.code === ExportResultCode.SUCCESS) resolve();
            else reject(result.error ?? /* @__PURE__ */ new Error("BatchSpanProcessor: span export failed"));
          });
          let pendingResources = null;
          for (let i = 0, len = spans.length; i < len; i++) {
            const resource = spans[i].resource;
            if (resource.asyncAttributesPending && resource.waitForAsyncAttributes) {
              pendingResources ??= /* @__PURE__ */ new Set();
              pendingResources.add(resource);
            }
          }
          if (pendingResources === null) doExport();
          else Promise.all(Array.from(pendingResources, (resource) => resource.waitForAsyncAttributes?.())).then(doExport, (err) => {
            globalErrorHandler(err);
            reject(err);
          });
        });
      });
    }
    _maybeStartTimer() {
      if (this._isExporting) return;
      const flush = () => {
        this._isExporting = true;
        this._flushOneBatch().finally(() => {
          this._isExporting = false;
          if (this._finishedSpans.length > 0) {
            this._clearTimer();
            this._maybeStartTimer();
          }
        }).catch((e) => {
          this._isExporting = false;
          globalErrorHandler(e);
        });
      };
      if (this._finishedSpans.length >= this._maxExportBatchSize) return flush();
      if (this._timer !== void 0) return;
      this._timer = setTimeout(() => flush(), this._scheduledDelayMillis);
      unrefTimer(this._timer);
    }
    _clearTimer() {
      if (this._timer !== void 0) {
        clearTimeout(this._timer);
        this._timer = void 0;
      }
    }
  };
  function unrefTimer(timer) {
    const handle = timer;
    if (typeof handle !== "number") handle.unref?.();
  }

  // node_modules/@opentelemetry/sdk-trace/dist/platform/browser/export/BatchSpanProcessor.mjs
  var BatchSpanProcessor = class extends BatchSpanProcessorBase {
    _visibilityChangeListener;
    constructor(options) {
      super(options);
      this.onInit(options);
    }
    onInit(options) {
      if (options.disableAutoFlushOnDocumentHide !== true && typeof document !== "undefined") {
        this._visibilityChangeListener = () => {
          if (document.visibilityState === "hidden") this.forceFlush().catch((error) => {
            globalErrorHandler(error);
          });
        };
        document.addEventListener("visibilitychange", this._visibilityChangeListener);
      }
    }
    onShutdown() {
      if (typeof document !== "undefined") {
        if (this._visibilityChangeListener) document.removeEventListener("visibilitychange", this._visibilityChangeListener);
      }
    }
  };

  // node_modules/@opentelemetry/sdk-trace/dist/platform/browser/RandomIdGenerator.mjs
  var TRACE_ID_BYTES = 16;
  var SPAN_ID_BYTES = 8;
  var TRACE_BUFFER = new Uint8Array(TRACE_ID_BYTES);
  var SPAN_BUFFER = new Uint8Array(SPAN_ID_BYTES);
  var HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));
  function randomFill(buf) {
    for (let i = 0; i < buf.length; i++) buf[i] = Math.random() * 256 >>> 0;
    for (let i = 0; i < buf.length; i++) if (buf[i] > 0) return;
    buf[buf.length - 1] = 1;
  }
  function toHex(buf) {
    let hex = "";
    for (let i = 0; i < buf.length; i++) hex += HEX[buf[i]];
    return hex;
  }
  var RandomIdGenerator = class {
    /**
    * Returns a random 16-byte trace ID formatted/encoded as a 32 lowercase hex
    * characters corresponding to 128 bits.
    */
    generateTraceId() {
      randomFill(TRACE_BUFFER);
      return toHex(TRACE_BUFFER);
    }
    /**
    * Returns a random 8-byte span ID formatted/encoded as a 16 lowercase hex
    * characters corresponding to 64 bits.
    */
    generateSpanId() {
      randomFill(SPAN_BUFFER);
      return toHex(SPAN_BUFFER);
    }
  };

  // node_modules/@opentelemetry/sdk-trace/dist/TracerProvider.mjs
  var TracerProvider$1 = class {
    _resource;
    _activeSpanProcessor;
    _tracerOptions;
    _tracers = /* @__PURE__ */ new Map();
    constructor(options = {}) {
      this._resource = options.resource ?? defaultResource();
      const spanProcessors = options.spanProcessors ?? [];
      this._activeSpanProcessor = new MultiSpanProcessor(spanProcessors);
      this._tracerOptions = {
        resource: this._resource,
        sampler: options.sampler ?? new ParentBasedSampler({ root: new AlwaysOnSampler() }),
        spanLimits: {
          attributeCountLimit: options.spanLimits?.attributeCountLimit ?? 128,
          attributeValueLengthLimit: options.spanLimits?.attributeValueLengthLimit ?? Infinity,
          eventCountLimit: options.spanLimits?.eventCountLimit ?? 128,
          linkCountLimit: options.spanLimits?.linkCountLimit ?? 128,
          attributePerEventCountLimit: options.spanLimits?.attributePerEventCountLimit ?? 128,
          attributePerLinkCountLimit: options.spanLimits?.attributePerLinkCountLimit ?? 128
        },
        idGenerator: options.idGenerator || new RandomIdGenerator(),
        spanProcessor: this._activeSpanProcessor,
        meterProvider: options.meterProvider ?? { getMeter() {
          return createNoopMeter();
        } }
      };
    }
    getTracer(name, version, options) {
      const key = `${name}@${version || ""}:${options?.schemaUrl || ""}`;
      if (!this._tracers.has(key)) this._tracers.set(key, new Tracer$1({
        name,
        version,
        schemaUrl: options?.schemaUrl
      }, this._tracerOptions));
      return this._tracers.get(key);
    }
    forceFlush(options) {
      const timeout = options?.timeoutMillis ?? 3e4;
      const promises = this._activeSpanProcessor["_spanProcessors"].map((spanProcessor) => {
        return new Promise((resolve) => {
          let state;
          const timeoutInterval = setTimeout(() => {
            resolve(/* @__PURE__ */ new Error(`Span processor did not completed within timeout period of ${timeout} ms`));
            state = 1;
          }, timeout);
          spanProcessor.forceFlush().then(() => {
            clearTimeout(timeoutInterval);
            if (state !== 1) {
              state = 0;
              resolve(state);
            }
          }).catch((error) => {
            clearTimeout(timeoutInterval);
            state = 2;
            resolve(error);
          });
        });
      });
      return new Promise((resolve, reject) => {
        Promise.all(promises).then((results) => {
          const errors = results.filter((result) => result !== 0);
          if (errors.length > 0) reject(errors);
          else resolve();
        }).catch((error) => reject([error]));
      });
    }
    shutdown() {
      return this._activeSpanProcessor.shutdown();
    }
    [inspectCustom](depth, options, inspect) {
      const processors = this._activeSpanProcessor["_spanProcessors"];
      const payload = {
        resource: { attributes: settledResourceAttributes(this._resource) },
        tracers: Array.from(this._tracers.keys()),
        spanProcessors: processors.map((p) => p.constructor?.name ?? "SpanProcessor")
      };
      return formatInspect("TracerProvider", payload, depth, options, inspect);
    }
  };

  // node_modules/@opentelemetry/sdk-trace/dist/sampler/TraceIdRatioBasedSampler.mjs
  var TraceIdRatioBasedSampler = class {
    _ratio;
    _upperBound;
    constructor(ratio = 0) {
      this._ratio = this._normalize(ratio);
      this._upperBound = this._ratio === 1 ? 4294967296 : Math.floor(this._ratio * 4294967295);
    }
    shouldSample(context2, traceId) {
      return { decision: isValidTraceId(traceId) && this._accumulate(traceId) < this._upperBound ? 2 : 0 };
    }
    toString() {
      return `TraceIdRatioBased{${this._ratio}}`;
    }
    _normalize(ratio) {
      if (typeof ratio !== "number" || isNaN(ratio)) return 0;
      return ratio >= 1 ? 1 : ratio <= 0 ? 0 : ratio;
    }
    _accumulate(traceId) {
      let accumulation = 0;
      for (let i = 0; i < 32; i += 8) {
        let part = 0;
        for (let j = 0; j < 8; j++) {
          const c = traceId.charCodeAt(i + j);
          const v = c < 58 ? c - 48 : c < 71 ? c - 55 : c - 87;
          part = part << 4 | v;
        }
        accumulation = (accumulation ^ part) >>> 0;
      }
      return accumulation;
    }
  };

  // tracing.js
  function retirerSaisie(url) {
    if (typeof url !== "string") return url;
    const query = url.indexOf("?");
    return query === -1 ? url : url.slice(0, query);
  }
  var RetirerSaisieProcessor = class {
    onStart(span) {
      const full = span.attributes?.["url.full"];
      if (typeof full === "string" && full.includes("?")) {
        span.setAttribute("url.full", retirerSaisie(full));
      }
    }
    onEnd() {
    }
    forceFlush() {
      return Promise.resolve();
    }
    shutdown() {
      return Promise.resolve();
    }
  };
  function demarrerTraces({ processeur, serviceVersion } = {}) {
    const origin = typeof location !== "undefined" && location.origin ? location.origin : "";
    const provider = new TracerProvider$1({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: "ciel-web",
        [ATTR_SERVICE_VERSION]: serviceVersion || "local"
      }),
      sampler: new ParentBasedSampler({
        root: new TraceIdRatioBasedSampler(1)
      }),
      spanProcessors: [
        new RetirerSaisieProcessor(),
        processeur || new BatchSpanProcessor({
          exporter: new OTLPTraceExporter({ url: `${origin}/otlp/v1/traces` }),
          scheduledDelayMillis: 5e3
        })
      ]
    });
    trace.setGlobalTracerProvider(provider);
    context.setGlobalContextManager(new StackContextManager().enable());
    propagation.setGlobalPropagator(new W3CTraceContextPropagator());
    registerInstrumentations({
      instrumentations: [new FetchInstrumentation({ ignoreUrls: [/\/otlp\//] })],
      tracerProvider: provider
    });
    return provider;
  }

  // tracing-entry.js
  demarrerTraces();
})();
