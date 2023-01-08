import { useState, useCallback } from 'react';

import { AppProvider, Button, Popover, ActionList } from '@shopify/polaris';

function SessionToken() {
  const [popoverActive, setPopoverActive] = useState(true);

  const togglePopoverActive = useCallback(
    () => setPopoverActive((popoverActive) => !popoverActive),
    [],
  );

  const activator = (
    <Button onClick={togglePopoverActive} disclosure>
      More actions
    </Button>
  );

  return (
    <AppProvider>
      <Popover
        active={popoverActive}
        activator={activator}
        autofocusTarget="first-node"
        onClose={togglePopoverActive}
      >
        <ActionList
          actionRole="menuitem"
          items={[{ content: 'Import' }, { content: 'Export' }]}
        />
      </Popover>
    </AppProvider>
  );
}

export default SessionToken