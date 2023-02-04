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
    method: String,
    rate: String
}
// See https://shopify.dev/apps/checkout/payment-customizations/config

impl Configuration {
    fn from_str(value: &str) -> Self {
        serde_json::from_str(value).expect("Unable to parse configuration value from metafield")
    }
}

#[shopify_function]
fn function(input: input::ResponseData) -> Result<output::FunctionResult> {
    let no_changes = output::FunctionResult { operations: vec![] };

    let _config = match input.payment_customization.metafield {
        Some(input::InputPaymentCustomizationMetafield { value }) =>
            Configuration::from_str(&value),
        None => return Ok(no_changes),
    };

    // See https://shopify.dev/apps/checkout/delivery-customizations/getting-started
    let is_hide = input.cart.delivery_groups.iter().filter(|group| {
        let selected_option = group.selected_delivery_option.as_ref();
        match selected_option {
            Some(option) => match &option.title {
                Some(title) => title.eq(&_config.rate),
                None => false
            },
            None => false
        }
    }).next().is_some();

    // See https://shopify.dev/apps/checkout/payment-customizations/getting-started
    let hide_payment_method = input.payment_methods.iter()
    .find(|&method| { // find = return the 1st one
        if is_hide {
            method.name.to_string().ne(&_config.method)
        } else {
            false
        }        
    })
    .map(|method| output::HideOperation {
        payment_method_id: method.id.to_string()
    });  

    Ok(output::FunctionResult { operations: vec![output::Operation {
        hide: hide_payment_method,
        move_: None,
        rename: None
    }]})
}

#[cfg(test)]
mod tests;
