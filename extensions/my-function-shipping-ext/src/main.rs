use shopify_function::prelude::*;
use shopify_function::Result;

use serde::{Deserialize, Serialize};

generate_types!(
    query_path = "./input.graphql",
    schema_path = "./schema.graphql"
);

#[derive(Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all(deserialize = "camelCase"))]
struct Configuration {
    rate: String,
    zip: String
}
// See https://shopify.dev/apps/checkout/delivery-customizations/config

impl Configuration {
    fn from_str(value: &str) -> Self {
        serde_json::from_str(value).expect("Unable to parse configuration value from metafield")
    }
}

#[shopify_function]
fn function(input: input::ResponseData) -> Result<output::FunctionResult> {
    let no_changes = output::FunctionResult { operations: vec![] };

    let _config = match input.delivery_customization.metafield {
        Some(input::InputDeliveryCustomizationMetafield { value }) =>
            Configuration::from_str(&value),
        None => return Ok(no_changes),
    };

    // See https://shopify.dev/apps/checkout/delivery-customizations/getting-started
    let is_hide = input.cart.delivery_groups.iter().filter(|group| {
        let selected_address = group.delivery_address.as_ref();
        match selected_address {
            Some(address) => match &address.zip {
                Some(zip) => zip.eq(&_config.zip),
                None => false
            },
            None => false
        }
    }).next().is_some();

    let hide_delivery_option = input.cart.delivery_groups.iter()
    .flat_map(|group| &group.delivery_options)
    .find(|&option| { // find = return the 1st one
        if is_hide {
            match &option.title {
                Some(title) => title.to_string().ne(&_config.rate),
                None => false
            }                
        } else {
            false
        }        
    })
    .map(|option| output::HideOperation {
        delivery_option_handle: option.handle.to_string()
    });  

    Ok(output::FunctionResult { operations: vec![output::Operation {
        hide: hide_delivery_option,
        move_: None,
        rename: None
    }]})

}

#[cfg(test)]
mod tests;
