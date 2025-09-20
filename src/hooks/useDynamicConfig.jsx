import { useState, useCallback, useMemo, useEffect } from 'react';
import { createDynamicConfig, CONFIG_PRESETS, getAvailableComponents } from '@/utils/puck.config';

// Custom hook for managing dynamic Puck configurations
export const useDynamicConfig = (initialConfig = 'full', options = {}) => {
  const {
    persistToLocalStorage = false,
    storageKey = 'puck-config',
    onConfigChange
  } = options;

  // State for current configuration
  const [currentPreset, setCurrentPreset] = useState(initialConfig);
  const [enabledComponents, setEnabledComponents] = useState([]);
  const [disabledComponents, setDisabledComponents] = useState([]);
  const [enabledCategories, setEnabledCategories] = useState([]);
  const [customComponents, setCustomComponents] = useState({});

  // Load configuration from localStorage if enabled
  useEffect(() => {
    if (persistToLocalStorage) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const config = JSON.parse(saved);
          setCurrentPreset(config.preset || initialConfig);
          setEnabledComponents(config.enabledComponents || []);
          setDisabledComponents(config.disabledComponents || []);
          setEnabledCategories(config.enabledCategories || []);
          setCustomComponents(config.customComponents || {});
        }
      } catch (error) {
        console.warn('Failed to load configuration from localStorage:', error);
      }
    }
  }, [persistToLocalStorage, storageKey, initialConfig]);

  // Generate the actual Puck configuration
  const puckConfig = useMemo(() => {
    let config;

    if (currentPreset && CONFIG_PRESETS[currentPreset]) {
      config = CONFIG_PRESETS[currentPreset]();
    } else {
      config = createDynamicConfig({
        enabledComponents,
        disabledComponents,
        enabledCategories,
        customComponents
      });
    }

    // Apply additional modifications
    if (enabledComponents.length > 0 || disabledComponents.length > 0 || enabledCategories.length > 0) {
      config = createDynamicConfig({
        preset: currentPreset,
        enabledComponents,
        disabledComponents,
        enabledCategories,
        customComponents
      });
    }

    return config;
  }, [currentPreset, enabledComponents, disabledComponents, enabledCategories, customComponents]);

  // Save configuration to localStorage
  const saveConfig = useCallback(() => {
    if (persistToLocalStorage) {
      try {
        const configToSave = {
          preset: currentPreset,
          enabledComponents,
          disabledComponents,
          enabledCategories,
          customComponents
        };
        localStorage.setItem(storageKey, JSON.stringify(configToSave));
      } catch (error) {
        console.warn('Failed to save configuration to localStorage:', error);
      }
    }
  }, [persistToLocalStorage, storageKey, currentPreset, enabledComponents, disabledComponents, enabledCategories, customComponents]);

  // Update configuration and save
  const updateConfig = useCallback((updates) => {
    if (updates.preset !== undefined) setCurrentPreset(updates.preset);
    if (updates.enabledComponents !== undefined) setEnabledComponents(updates.enabledComponents);
    if (updates.disabledComponents !== undefined) setDisabledComponents(updates.disabledComponents);
    if (updates.enabledCategories !== undefined) setEnabledCategories(updates.enabledCategories);
    if (updates.customComponents !== undefined) setCustomComponents(updates.customComponents);

    // Trigger save and callback
    setTimeout(() => {
      saveConfig();
      if (onConfigChange) {
        onConfigChange(puckConfig);
      }
    }, 0);
  }, [saveConfig, onConfigChange, puckConfig]);

  // Preset management
  const setPreset = useCallback((preset) => {
    updateConfig({
      preset,
      enabledComponents: [],
      disabledComponents: [],
      enabledCategories: []
    });
  }, [updateConfig]);

  // Component management
  const enableComponent = useCallback((componentName) => {
    setEnabledComponents(prev =>
      prev.includes(componentName) ? prev : [...prev, componentName]
    );
    setDisabledComponents(prev =>
      prev.filter(name => name !== componentName)
    );
  }, []);

  const disableComponent = useCallback((componentName) => {
    setDisabledComponents(prev =>
      prev.includes(componentName) ? prev : [...prev, componentName]
    );
    setEnabledComponents(prev =>
      prev.filter(name => name !== componentName)
    );
  }, []);

  const toggleComponent = useCallback((componentName) => {
    if (enabledComponents.includes(componentName)) {
      disableComponent(componentName);
    } else {
      enableComponent(componentName);
    }
  }, [enabledComponents, enableComponent, disableComponent]);

  // Category management
  const enableCategory = useCallback((category) => {
    setEnabledCategories(prev =>
      prev.includes(category) ? prev : [...prev, category]
    );
  }, []);

  const disableCategory = useCallback((category) => {
    setEnabledCategories(prev =>
      prev.filter(cat => cat !== category)
    );
  }, []);

  const toggleCategory = useCallback((category) => {
    if (enabledCategories.includes(category)) {
      disableCategory(category);
    } else {
      enableCategory(category);
    }
  }, [enabledCategories, enableCategory, disableCategory]);

  // Custom component management
  const addCustomComponent = useCallback((name, componentConfig) => {
    setCustomComponents(prev => ({
      ...prev,
      [name]: componentConfig
    }));
  }, []);

  const removeCustomComponent = useCallback((name) => {
    setCustomComponents(prev => {
      const { [name]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  // Reset configuration
  const resetConfig = useCallback(() => {
    setCurrentPreset(initialConfig);
    setEnabledComponents([]);
    setDisabledComponents([]);
    setEnabledCategories([]);
    setCustomComponents({});
    if (persistToLocalStorage) {
      localStorage.removeItem(storageKey);
    }
  }, [initialConfig, persistToLocalStorage, storageKey]);

  // Get current state information
  const getConfigInfo = useCallback(() => {
    const availableComponents = getAvailableComponents();
    const totalComponents = Object.values(availableComponents).flat().length;
    const activeComponents = Object.keys(puckConfig.components).length;

    return {
      preset: currentPreset,
      totalComponents,
      activeComponents,
      enabledComponents,
      disabledComponents,
      enabledCategories,
      customComponents: Object.keys(customComponents),
      availableCategories: Object.keys(availableComponents)
    };
  }, [currentPreset, puckConfig, enabledComponents, disabledComponents, enabledCategories, customComponents]);

  // Bulk operations
  const enableAllComponents = useCallback(() => {
    const availableComponents = getAvailableComponents();
    const allComponents = Object.values(availableComponents).flat();
    setEnabledComponents(allComponents);
    setDisabledComponents([]);
  }, []);

  const disableAllComponents = useCallback(() => {
    setEnabledComponents([]);
    setDisabledComponents([]);
    setEnabledCategories([]);
  }, []);

  const enableAllCategories = useCallback(() => {
    const availableComponents = getAvailableComponents();
    setEnabledCategories(Object.keys(availableComponents));
  }, []);

  // Export/Import configuration
  const exportConfig = useCallback(() => {
    return {
      preset: currentPreset,
      enabledComponents,
      disabledComponents,
      enabledCategories,
      customComponents
    };
  }, [currentPreset, enabledComponents, disabledComponents, enabledCategories, customComponents]);

  const importConfig = useCallback((configData) => {
    try {
      setCurrentPreset(configData.preset || initialConfig);
      setEnabledComponents(configData.enabledComponents || []);
      setDisabledComponents(configData.disabledComponents || []);
      setEnabledCategories(configData.enabledCategories || []);
      setCustomComponents(configData.customComponents || {});
      return true;
    } catch (error) {
      console.error('Failed to import configuration:', error);
      return false;
    }
  }, [initialConfig]);

  return {
    // Configuration state
    puckConfig,
    currentPreset,
    enabledComponents,
    disabledComponents,
    enabledCategories,
    customComponents,

    // Configuration methods
    updateConfig,
    setPreset,
    resetConfig,

    // Component methods
    enableComponent,
    disableComponent,
    toggleComponent,

    // Category methods
    enableCategory,
    disableCategory,
    toggleCategory,

    // Custom component methods
    addCustomComponent,
    removeCustomComponent,

    // Bulk operations
    enableAllComponents,
    disableAllComponents,
    enableAllCategories,

    // Information and utilities
    getConfigInfo,
    exportConfig,
    importConfig,

    // Available options
    availablePresets: Object.keys(CONFIG_PRESETS),
    availableComponents: getAvailableComponents()
  };
};

// Configuration Manager Component
export const ConfigurationManager = ({
  config,
  onConfigChange,
  className = "",
  showPresets = true,
  showCategories = true,
  showComponents = true,
  showBulkActions = true
}) => {
  const {
    currentPreset,
    enabledCategories,
    enabledComponents,
    setPreset,
    toggleCategory,
    toggleComponent,
    enableAllComponents,
    disableAllComponents,
    enableAllCategories,
    resetConfig,
    getConfigInfo,
    availablePresets,
    availableComponents
  } = config;

  const configInfo = getConfigInfo();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Configuration Summary */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Configuration Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Active Preset:</span>
            <span className="ml-2 font-medium">{configInfo.preset}</span>
          </div>
          <div>
            <span className="text-gray-600">Active Components:</span>
            <span className="ml-2 font-medium">{configInfo.activeComponents}/{configInfo.totalComponents}</span>
          </div>
        </div>
      </div>

      {/* Presets */}
      {showPresets && (
        <div>
          <h4 className="font-medium mb-3">Quick Presets</h4>
          <div className="grid grid-cols-2 gap-2">
            {availablePresets.map(preset => (
              <button
                key={preset}
                onClick={() => setPreset(preset)}
                className={`px-3 py-2 rounded text-sm text-left ${
                  currentPreset === preset
                    ? 'bg-primary-100 text-primary-800 border-primary-200'
                    : 'bg-white border border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium capitalize">{preset}</div>
                <div className="text-xs text-gray-600">
                  {preset === 'basic' && 'Essential components only'}
                  {preset === 'full' && 'All available components'}
                  {preset === 'content' && 'Content-focused editing'}
                  {preset === 'marketing' && 'Marketing and engagement'}
                  {preset === 'minimal' && 'Minimal component set'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      {showCategories && (
        <div>
          <h4 className="font-medium mb-3">Component Categories</h4>
          <div className="space-y-2">
            {Object.entries(availableComponents).map(([category, components]) => (
              <label key={category} className="flex items-center justify-between p-2 bg-white rounded border">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={enabledCategories.includes(category)}
                    onChange={() => toggleCategory(category)}
                    className="mr-3"
                  />
                  <div>
                    <span className="font-medium capitalize">{category}</span>
                    <span className="ml-2 text-sm text-gray-600">
                      ({components.length} components)
                    </span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Individual Components */}
      {showComponents && (
        <div>
          <h4 className="font-medium mb-3">Individual Components</h4>
          <div className="space-y-4">
            {Object.entries(availableComponents).map(([category, components]) => (
              <div key={category} className="bg-white p-3 rounded border">
                <h5 className="text-sm font-medium text-gray-700 capitalize mb-2">{category}</h5>
                <div className="grid grid-cols-1 gap-1">
                  {components.map(component => (
                    <label key={component} className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={enabledComponents.includes(component)}
                        onChange={() => toggleComponent(component)}
                        className="mr-2"
                      />
                      <span>{component}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {showBulkActions && (
        <div>
          <h4 className="font-medium mb-3">Bulk Actions</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={enableAllCategories}
              className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200"
            >
              Enable All Categories
            </button>
            <button
              onClick={enableAllComponents}
              className="px-3 py-1 bg-primary-100 text-primary-800 rounded text-sm hover:bg-primary-200"
            >
              Enable All Components
            </button>
            <button
              onClick={disableAllComponents}
              className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
            >
              Disable All
            </button>
            <button
              onClick={resetConfig}
              className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm hover:bg-gray-200"
            >
              Reset to Default
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Higher-order component for easy integration
export const withDynamicConfig = (WrappedComponent, defaultConfig = 'full') => {
  return (props) => {
    const dynamicConfig = useDynamicConfig(defaultConfig, {
      persistToLocalStorage: true,
      storageKey: `puck-config-${props.configId || 'default'}`
    });

    return (
      <WrappedComponent
        {...props}
        dynamicConfig={dynamicConfig}
        puckConfig={dynamicConfig.puckConfig}
      />
    );
  };
};
