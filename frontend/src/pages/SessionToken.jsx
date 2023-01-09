import { useState, useCallback } from 'react';
import { Button, Popover, ActionList } from '@shopify/polaris';

// App Bridge Session Token sample
// See https://shopify.dev/apps/auth/oauth/session-tokens
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

  );
}

export default SessionToken