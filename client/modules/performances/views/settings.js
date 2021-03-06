define(['application', 'marionette', './templates/settings.tpl', 'lib/regions/fade_in', './attention_regions', 'lib/api'
        , 'path', '../entities/settings', '../entities/performance'],
    function(App, Marionette, template, FadeInRegion, AttentionRegionsView, api, path, Settings, Performance) {
        return Marionette.View.extend({
            template: template,
            ui: {
                pauseBehaviorCheckbox: '.app-pause-behavior-checkbox',
                keywords: '.app-keywords',
                tabs: '.app-tabs a',
                settingsTab: '.app-settings-tab',
                attentionTab: '.app-attention-tab',
                variableTemplate: '.app-variable-template',
                variableContainer: '.app-variables-container',
                addVariableButton: '.app-add-variable-btn',
                saveButton: '.app-save-btn',
                removeVariableButton: '.app-remove-variable-btn',
                name: '.app-performance-name',
                performanceNameContainer: '.app-performance-name-container',
                nameHeader: '.app-name-title'
            },
            regions: {
                selectAreas: {
                    el: '.app-select-areas-content',
                    regionClass: FadeInRegion
                }
            },
            events: {
                'click @ui.addVariableButton': 'addVariable',
                'change @ui.pauseBehaviorCheckbox': 'updatePauseBehavior',
                'click @ui.removeVariableButton': 'removeVariable',
                'click @ui.saveButton': 'save',
                'change @ui.name': 'changeName'
            },
            initialize: function(options) {
                this.mergeOptions(options, ['path', 'layoutView'])
                if (!this.model) this.model = new Settings({}, {path: this.path})
                this.performance = this.collection.get(this.path)
                this.folder = !this.performance
                if (this.folder) this.performance = new Performance({id: this.path, timelines: []})
            },
            onRender: function() {
                let self = this
                this.model.fetch({
                    success: function() {
                        self.showKeywords()
                        self.showVariables()
                        self.showPauseBehavior()
                    }
                })

                if (this.performance) {
                    this.updateName()
                    this.listenTo(this.performance, 'change:name', function() {
                        self.updateName()
                    })
                } else {
                    this.ui.nameHeader.html('Folder name')
                }

                if (!this.path) this.ui.performanceNameContainer.hide()

                this.ui.tabs.on('shown.bs.tab', function(e) {
                    if ($(e.target).is(self.ui.attentionTab))
                        self.getRegion('selectAreas').show(new AttentionRegionsView({path: self.path}))
                })

                this.ui.settingsTab.tab('show')
            },
            updateName: function() {
                this.ui.name.val(path.basename(this.performance.get('id')))
            },
            save: function() {
                let self = this

                this.setVariables()
                this.setKeywords()

                this.model.save({}, {
                    success: function() {
                        self.updatePerformanceName()
                        App.Utilities.showPopover(self.ui.saveButton, 'Saved', 'right')
                    },
                    error: function() {
                        App.Utilities.showPopover(self.ui.saveButton, 'Unable to save', 'right')
                    }
                })
            },
            updatePerformanceName: function() {
                let self = this,
                    name = this.ui.name.val()

                if (this.performance && this.performance.get('name') !== name) {
                    this.performance.save({name: name}, {
                        success: function(p) {
                            self.model.path = p.id

                            let success = function() {
                                self.layoutView.performancesView.navigate(p.id)
                            }

                            if (self.folder)
                                self.collection.fetch({success: success})
                            else {
                                self.performance.load()
                                success()
                            }
                        },
                        error: function() {
                            App.Utilities.showPopover(self.ui.name, 'Error saving performance', 'right')
                        }
                    })
                }
            },
            showVariables: function() {
                let self = this
                $.each(this.model.get('variables') || {}, function(key, value) {
                    self.addVariable(key, value)
                })
            },
            showPauseBehavior: function() {
                let pauseBehavior = this.model.get('pause_behavior')
                this.ui.pauseBehaviorCheckbox.prop('checked', typeof pauseBehavior == 'undefined' ? true : pauseBehavior)
            },
            showKeywords: function() {
                this.ui.keywords.val((this.model.get('keywords') || []).join(', '))
            },
            setKeywords: function() {
                let keywords = _.map(this.ui.keywords.val().split(','), function(k) {
                    return k.trim()
                })

                this.model.set('keywords', keywords)
            },
            setVariables: function() {
                let variables = {},
                    inputs = $('input', this.ui.variableContainer)

                for (let i = 0; i < inputs.length / 2; i++) {
                    let key = $(inputs[i * 2]).val(),
                        val = $(inputs[i * 2 + 1]).val()

                    if (key && val) variables[key] = val
                }

                this.model.set('variables', variables)
            },
            updatePauseBehavior: function() {
                this.model.set('pause_behavior', this.ui.pauseBehaviorCheckbox.prop('checked'))
            },
            addVariable: function(key, value) {
                let field = this.ui.variableTemplate.clone().find('.form-group')
                if (key && value) {
                    field.find('.app-key-input').val(key)
                    field.find('.app-value-input').val(value)
                }

                this.ui.variableContainer.append(field)
            },
            removeVariable: function(e) {
                $(e.target).closest('.form-group').fadeOut(100, function() {
                    $(this).remove()
                })
            }
        })
    })
