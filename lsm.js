/*

    Playing around with getters and setters to create a convenience wrapper for localStorage
    that makes it easier to store and retreive data in deep JSON structures.

    Use LSM.namespace to create a namespace instance that will be mapped to a key in localstorage. 
    LSM.namespace returns an LSMobject that has simple get and set methods as well as event subscribers. 
    Adding an object to your namespace will automatically convert the object to an instance of LSMobject, and
    give you getters and setters multiple levels down. When you set a value on any object inside your namespace
    using the set function, your data will automatically be saved to localStorage.

    Does a simple check to see if localStorage is available. If not, it will fail silently and let you keep
    manupulating data without persisting. LSM.localStorageAvailable will tell you if LSM believes that
    localStorage exists.

*/

!(function(window, document, undefined){
    "use strict";
    var LSManager, LSM, LSMObject, _LSM = window.LSM;

    // Creates and manages namespace instances
    LSManager = function(){
        this._init.apply(this, arguments);
    };

    LSManager.prototype = {
        _init: function(){
            this._namespaces = {};
            this.localStorageAvailable = this._checkLocalStorage();
        },

        // Check for local storage availability
        _checkLocalStorage: function(){
            var d = new Date();
            try {
                localStorage.setItem(d, d);
                localStorage.removeItem(d);
            } catch(e){
                return false;
            }
            return true;
        },

        _createLSMO: function(namespace){
            var lsm = new LSMObject(this._fetchData(namespace), namespace);
            this._namespaces[namespace] = lsm;
            return lsm;
        },

        _defer: function(fn){
            setTimeout(fn, 0);
        },

        // Returns the LSMObject associated with the provided namespace
        _getLSMO: function(namespace){
            return this._namespaces[namespace];
        },

        // Saves data to localstorage for the provided instance
        _toLocalStorage: function(obj){
            if(this.localStorageAvailable){
                this._defer(function(){
                    try {
                        localStorage.setItem(obj._LSMnamespace, JSON.stringify(obj._object));
                        obj._triggerEventType('onSave');
                    } catch(ignore){

                    }
                });
            }
        },

        // Retrieves the data associated with the provided namespace
        _fetchData: function(namespace){
            if(!this.localStorageAvailable) {
                return;
            }
            return JSON.parse(localStorage.getItem(namespace));
        },

        _destroy: function(namespace){
            try {
                localStorage.removeItem(namespace);
                delete this._namespaces[namespace];
            } catch(ignore)
            {

            }
        },

        localStorageAvailable: false,

        //Re-map the original LSM var and return the local one.
        noConflict: function(){
            window.LSM = _LSM;
            return LSM;
        },

        // Creates a new namespace and returns an instance of LSMObject, map the return value 
        // from this to a variable and use that as your entry point for manipulating data for 
        // that namespace.
        namespace: function(namespace){
            if(this._namespaces[namespace]){
                return this._namespaces[namespace];
            }
            return this._createLSMO(namespace);
        }
        
    };

    // Stores data, provides getters and setters and handles events for namespace instances.
    LSMObject = function(){
        this._init.apply(this, arguments);
    };

    LSMObject.prototype = {

        _init: function(data, namespace, parent){
            this._LSMnamespace = namespace;

            //Keeps track of events and subscribers
            this._LSMlisteners = {};

            //A clean representation of the data stored in this object instance
            this._object = data || {};

            //Keeps track of whether this is a top level instance
            this._parent = parent || false;

            this._parseObjects(this._parent);
        },

        //Returns the top level instance for this namespace
        _ctx: function(){
            if(this._parent){
                return LSM._getLSMO(this._LSMnamespace);
            }
            return this;
        },

        _hasEvents: function(eventType){
            return this._LSMlisteners[eventType] && this._LSMlisteners[eventType].length;
        },

        _triggerEventType: function(eventType){
            var i, events, len, fn;
            if(!this._hasEvents(eventType)) {
                return;
            }
            i = 0;
            events = this._LSMlisteners[eventType];
            len = events.length;
            for(i ; i < len; i++){
                fn = events[i];
                fn(this);
            }
        },

        _onChange: function(){
            this._triggerEventType('change');
            if(this._parent){
                this._ctx()._triggerEventType('change');
            }
        },

        // Delegates to LSM._toLocalStorage with the top level instance of this namespace
        // to save all data to localStorage
        _toLocalStorage: function(){
            LSM._toLocalStorage(this._ctx());
        },

        // Adds all of the properties of another object to this instance.
        _extend: function(obj){
            var o;
            for(o in obj){
                if(obj.hasOwnProperty(o)){
                    this._object[o] = JSON.parse(JSON.stringify(obj[o]));
                    if(this._isObject(obj[o])){
                        this[o] = new LSMObject(obj[o], this._LSMnamespace, true);
                    } else {
                        this[o] = JSON.parse(JSON.stringify(obj[o]));
                    }
                }
            }
            return this;
        },

        // Simple check to see if a value is an object.
        _isObject: function(val){
            return Object.prototype.toString.call(val) === '[object Object]';
        },

        // Looks through the entire object and converts any child objects to LSMobject instances to
        // give them getters, setters and events. Change events bound to child instances will als trigger
        // on will trigger on the top level instance, but it does not currently keep track of the entire
        // parent chain.
        // Setting a value on a child object will save the data of the top level instance and all 
        // of its children to localStorage.
        _parseObjects: function(){
            var obj = this._object,
                o;
            if(obj){
                for(o in obj){
                    if(obj.hasOwnProperty(o)){
                        if(this._isObject(obj[o])){
                            this[o] = new LSMObject(obj[o], this._LSMnamespace, true);
                            continue;
                        }
                        this[o] = obj[o];
                    }
                }
            }
            return this;
        },

        // Simple method for adding subscribers to any custom event type,
        // Events will be fired on the object and on the top level context
        on: function(eventType, fn){
            switch(eventType){
                case 'change':
                    if(!this._hasEvents(eventType)){
                        this._LSMlisteners[eventType] = [];
                    }
                    this._LSMlisteners[eventType].push(fn);
                    break;
            }
            return this;
        },

        // Unsubscribe to events. Passing only an eventType will remove all subscribers
        // of that type
        off: function(eventType, fn){
            var listeners = this._LSMlisteners[eventType],
                len = listeners.length,
                i = 0;
            if(!fn){
                listeners = [];
                return this;
            }
            for(i ; i < len ; i++){
                if(listeners[i] == fn){
                    listeners.splice(i, i+1);
                } 
            }
            return this;
        },

        //Manually triggers an event
        trigger: function(eventType){
            this._triggerEventType(eventType);
            return this;
        },

        // Adds the key and value to this instance, if an object is passed as the key,
        // the instance will be extended with all of the objects properties using the
        // _extend method. 
        set: function(key, value){
            if(this._isObject(key)){
                this._extend(key);
            } else {
                this._object[key] = value;
                if(this._isObject(value)){
                    this[key] = new LSMObject(value, this._LSMnamespace, true);
                } else {
                    this[key] = value;
                }
            }
            this._toLocalStorage();
            this._onChange();
            return this;
        },

        // Returns the raw data for the key, if no key is given, the data for the
        // entire instance will be returned.
        get: function(key){
            if(key) {
                return this._object[key];
            }
            return this._object;
        },

        //Delete all data bound to this instance from localstorage.
        destroy: function(){
            var o;
            for(o in this._object){
                if(this.hasOwnProperty(o)){
                    delete this[o];
                }
            }
            this._object = {};
            LSM._destroy(this._LSMnamespace);
        }
    };

    LSM = new LSManager();
    window.LSM = LSM;

}(window, document, undefined));
