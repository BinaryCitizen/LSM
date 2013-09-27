LSM
===

    Playing around with getters and setters to create a convenience wrapper for localStorage
    that makes it simple to store and retreive data in nested JSON structures.

    Use LSM.namespace to create a namespace instance that will be mapped to a key in localstorage. 
    LSM.namespace returns an LSMobject that has simple get and set methods as well as event subscribers. 
    Adding an object to your namespace will automatically convert the object to an instance of LSMobject, and
    give you getters and setters multiple levels down. When you set a value on any object inside your namespace
    using the set function, your data will automatically be saved to localStorage.

    Does a simple check to see if localStorage is available. If not, it will fail silently and let you keep
    manupulating data without persisting. LSM.localStorageAvailable will tell you if LSM believes that
    localStorage exists.
    
    Built for convenience and to be easily extendable, don't attach ten thousand events and set a million values
    inside of a loop and you'll be fine.
    
Usage
===

    var myData = LSM.namespace('myData');
  
    myData.set('foo', 42);
    myData.get();                       // Object {foo: 42}
    myData.get('foo');                  // 42
  
    myData.set('bar', {baz: true});
    myData.get();                       // Object {foo: 42, bar: Object}
    myData.get('bar');                  // Object {baz: true}
    myData.bar.get()                    //Object {baz: true}
    myData.bar.get('baz')               //true
    
    myData.on('change', function(obj){
        console.log('Object was changed', obj);
    });
    
    myData.set('zap', 9);               //Object was changed, myData
    
    You may also pass a single object to the set method, and all of its properties will be mapped onto the object instance
    myData.set({
      foo: true,
      bar: false
    });
    myData.get('foo');                 //true
    myData.get('bar');                 //false
    
    Create any number of instances:
    var someOtherData = LSM.namespace('someOtherData');
    someOtherData.set('foo', 12);
    someOtherData.get('foo');         //12
    myData.get('foo');                //42
    
    etc.
    
    Data will be saved to localStorage behind the scenes and is accessible through the same getters and setters on page refresh.
    
    To clear your data from localStorage, use
    myData.destroy();
    myData.get()                        // Object {}
