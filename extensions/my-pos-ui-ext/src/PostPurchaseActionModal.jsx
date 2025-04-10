import React from 'react'

import { Text, Screen, ScrollView, Navigator, Button, useApi, reactExtension } from '@shopify/ui-extensions-react/point-of-sale';

const Modal = () => {

  const api = useApi();

  return (
    <Navigator>
      <Screen name="HelloWorld" title="Hello World!">
        <ScrollView>
          <Text>Welcome to the extension!</Text>
          <Text>&nbsp;</Text>
          <Button title="Print" onPress={() => {
            api.session.getSessionToken().then((token) => {
              api.print.print(`/mocklogin?sessiontoken=${token}`);
              api.toast.show(`Printing '/mocklogin?sessiontoken=${token}'...`);
              //FYI you can fetch the app server directly with the session token.
              /*fetch(`https://APP_URL/mocklogin?sessiontoken=${token}`).then((r) => {
                // Do someting.
              });*/
            });
          }} />
        </ScrollView>
      </Screen>
    </Navigator>
  )
}

export default reactExtension('pos.purchase.post.action.render', () => <Modal />);