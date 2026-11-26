<?php
/**
 * Removes Squished's settings when the plugin is deleted.
 *
 * @package Squished
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

delete_option( 'squished_settings' );
