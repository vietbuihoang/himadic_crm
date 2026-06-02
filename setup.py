
# -*- coding: utf-8 -*-
from setuptools import setup, find_packages

with open("requirements.txt") as f:
    install_requires = f.read().strip().split("\n")

setup(
    name="himedic_crm",
    version="1.0.0",
    description="Hi-Medic CRM — Frappe v15 application for sales, sampling and lab logistics",
    author="Hi-Medic",
    author_email="info@miyano.com.vn",
    packages=find_packages(),
    zip_safe=False,
    include_package_data=True,
    install_requires=install_requires,
)
