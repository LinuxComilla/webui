let path = require('path')

define(['application', 'marionette', './templates/settings.tpl', 'json-editor', 'lib/json_editor/slider'],
    function(App, Marionette, template, JSONEditor) {
        return Marionette.View.extend({
            template: template,
            ui: {
                settings: '.app-settings'
            },
            modelEvents: {
                change: 'setConfig'
            },
            initialize: function(options) {
                this.mergeOptions(options, ['schemaModel'])
                this.schema = options.schemaModel.toJSON()
            },
            onRender: function() {
                let self = this
                // disable select2
                JSONEditor.defaults.editors.select.prototype.setupSelect2 = function() {
                    this.select2 = null
                }
                this.editor = new JSONEditor(this.ui.settings.get(0), {
                    form_name_root: 'config',
                    theme: 'bootstrap3',
                    schema: this.schema,
                    disable_collapse: true,
                    disable_edit_json: true,
                    disable_array_reorder: true,
                    disable_properties: this.options.refresh,
                    no_additional_properties: this.options.refresh,
                    iconlib: 'fontawesome4'
                })

                this.setConfig()
                let init = true
                self.editor.on('change', function() {
                    // skip the first update since it is tiggered before values are properly set
                    if (init)
                        init = false
                    else
                        self.update()
                })

                if (this.options.refresh)
                    this.refreshInterval = setInterval(function() {
                        self.model.fetch()
                    }, 1000)
            },
            onDestroy: function() {
                clearInterval(this.refreshInterval)
                this.editor.destroy()
            },
            setConfig: function() {
                let all = this.schemaModel.getAllKeys(),
                    self = this,
                    config = this.model.toJSON(),
                    hiddenKeys = _.difference(all, _.keys(config))

                config = _.each(config, function(val, key) {
                    if (self.schema['properties'][key] && _.includes(['array', 'object'],
                            self.schema['properties'][key]['type']) && typeof val === 'string') {
                        try {
                            config[key] = JSON.parse(val)
                        } catch (err) {
                            console.log(err)
                        }
                    }
                })

                delete config['node_schema']
                if (typeof self.schemaModel.getGroupName === 'function') {
                    _.each(config, function(val, key) {
                        let groupName = self.schemaModel.getGroupName(key),
                            editor = self.editor.getEditor(groupName),
                            parent = editor.parent

                        if (editor) {
                            if (parent) parent.addObjectProperty(key)
                            editor.setValue(val)
                            if (parent) parent.refreshValue()
                        }
                    })

                    if (!_.isEmpty(config))
                        _.each(hiddenKeys, function(key) {
                            let groupName = self.schemaModel.getGroupName(key),
                                editor = self.editor.getEditor(path.dirname(groupName.replace('.', '/')).replace('/', '.'))

                            editor.removeObjectProperty(key)
                        })
                } else
                    this.editor.setValue(config)
            },
            update: function() {
                // only valid settings should be saved
                if (this.editor.validate().length === 0) {
                    let values = this.editor.getValue()

                    delete values['node_schema']
                    values = this.getAttributes(values)

                    _.each(values, function(val, key) {
                        if (val && _.includes([Array, Object], val.constructor)) {
                            if (val.constructor === Array)
                                val = _.sortBy(val, 'name')

                            values[key] = JSON.stringify(val)
                        }
                    })

                    this.model.clear({silent: true})
                    this.model.save(values, {
                        error: function() {
                            console.log('error updating node configuration')
                        }
                    })
                }
            },
            getAttributes: function(values) {
                let self = this,
                    attributes = {}

                _.each(values, function(val, key) {
                    if (val && val.constructor === Object)
                        _.extend(attributes, self.getAttributes(val))
                    else
                        attributes[key] = val
                })

                return attributes
            }
        })
    })
