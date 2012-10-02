Options = {
    options: {},
    const: {
        "LIST_STYLE_FULL": 1,
        "LIST_STYLE_SHORT": 2
    },

    load: function() {
        self = window.KickWatcherOptions;
        try {
            var options = JSON.parse(localStorage.KickWatcherOptions);
        } catch(e) {
            if(e.type == "unexpected_token" && e.arguments[0] == "u") {
                self.options = self.getDefaults();
                self.save();
                options = self.options;
            }
        }

        if(typeof options == "object") {
            self.options = options;
            console.log("aaaa", self.options);
        }
    },

    save: function() {
        self = window.KickWatcherOptions;
        localStorage.KickWatcherOptions = JSON.stringify(self.options);
    },

    saveSettings: function() {
        self = window.KickWatcherOptions;
        self.options.LIST_STYLE         = self.const[jQuery("input[name=list-style]:checked").val()];
        self.options.USE_NOTIFICATIONS  = (jQuery("input[name=use-notifications]").attr("checked")=="checked")?true:false;
        self.save();
    },

    bindSettings: function() {
        self = window.KickWatcherOptions;
        jQuery("input[name=list-style]").each(function() {
            jQuery(this).bind("change", function(){
                self.saveSettings()
            });
            if(self.options.LIST_STYLE == self.const[jQuery(this).val()]) {
                jQuery(this).attr("checked", true);
            }
        });

        if(self.options.USE_NOTIFICATIONS == true) {
            jQuery("input[name=use-notifications]")
                .bind("change", function(){
                    self.saveSettings()
                })
                .attr("checked", true);
        }
    },

    bindReset: function() {
        self = window.KickWatcherOptions;
        jQuery(".button-reset").bind("click", function(){
            jQuery("input").unbind("change");
            self.options = self.getDefaults();
            self.save();
            self.bindSettings();
        });
    },

    getDefaults: function() {
        self = window.KickWatcherOptions;
        return {
            LIST_STYLE: self.const.LIST_STYLE_SHORT,
            USE_NOTIFICATIONS: true
        }
    },

    init:function() {
        self = this;
        window.KickWatcherOptions = self;
        jQuery(document).ready(function(){
            self.load();
            self.bindSettings();
            self.bindReset()
        });
    }
}.init();